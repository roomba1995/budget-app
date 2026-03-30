/**
 * Parser for 積算シート (【251001】アジア選手積算 / 【251001】パラ選手積算).
 *
 * Column mapping (0-based, row index 3 = header):
 *   0: 通し番号  1: 施設番号  2: 宿泊施設名
 *   3: 一日あたり客室総額(税込)   8: 利用想定客室数
 *  10: 一日あたりファンクション総額(税込)
 *  11: 客室総計(税込)   12: ファンクション総計(税込)
 *  23: 施設合計  24: 開始日  25: 終了日  26: 確保泊数
 */

export interface AllocationSection {
  dailyRoom: number | null;
  rooms: number | null;
  dailyFunc: number | null;
  roomTotal: number | null;
  funcTotal: number | null;
  facilityTotal: number | null;
  nights: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface AllocationEntry {
  hotelName: string;
  asia: AllocationSection | null;
  para: AllocationSection | null;
}

/** key = facilityNo as plain integer string ("12", "121", etc.) */
export type AllocationDB = Record<string, AllocationEntry>;

export interface UnmatchedRow {
  group: "asia" | "para";
  no: number;
  facilityNo: string;
  hotelName: string;
  section: AllocationSection;
  reason: "empty_facility_no" | "no_registered_hotel";
}

export interface AllocationParseResult {
  db: AllocationDB;
  unmatched: UnmatchedRow[];
  asiaCount: number;
  paraCount: number;
}

export const ALLOCATION_STORAGE_KEY = "budget-allocation-v1";
/** key = Excel hotel name → registered facilityNo override */
export const ALLOCATION_MATCH_KEY = "budget-allocation-match-v1";

// ── helpers ───────────────────────────────────────────────────────────────────

function cellStr(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/\r\n/g, " ").trim();
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v.replace(/[,¥，]/g, "").trim());
    return isNaN(n) ? null : n;
  }
  return null;
}

function formatDateValue(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.includes("T")) return v.slice(0, 10);
  return null;
}

function normFacilityNo(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? s : String(n);
}

// ── main parser ───────────────────────────────────────────────────────────────

function parseSheet(
  rows: unknown[][],
  group: "asia" | "para"
): { matched: Array<{ facilityNo: string; hotelName: string; section: AllocationSection }>; unmatched: UnmatchedRow[] } {
  const matched: Array<{ facilityNo: string; hotelName: string; section: AllocationSection }> = [];
  const unmatched: UnmatchedRow[] = [];

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const colA = (row as unknown[])[0];
    if (colA == null || typeof colA !== "number" || !Number.isInteger(colA) || colA <= 0) continue;

    const no = colA;
    const facilityNo = normFacilityNo((row as unknown[])[1]);
    const hotelName = cellStr((row as unknown[])[2]);

    const section: AllocationSection = {
      dailyRoom: toNum((row as unknown[])[3]),
      rooms: toNum((row as unknown[])[8]),
      dailyFunc: toNum((row as unknown[])[10]),
      roomTotal: toNum((row as unknown[])[11]),
      funcTotal: toNum((row as unknown[])[12]),
      facilityTotal: toNum((row as unknown[])[23]),
      nights: toNum((row as unknown[])[26]),
      startDate: formatDateValue((row as unknown[])[24]),
      endDate: formatDateValue((row as unknown[])[25]),
    };

    if (!facilityNo) {
      unmatched.push({ group, no, facilityNo, hotelName, section, reason: "empty_facility_no" });
    } else {
      matched.push({ facilityNo, hotelName, section });
    }
  }

  return { matched, unmatched };
}

export async function parseBudgetAllocationFromFile(
  file: File,
  /** Already-stored manual overrides: Excel hotel name → facilityNo */
  overrides: Record<string, string> = {}
): Promise<AllocationParseResult> {
  const { read, utils } = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = read(buf, { type: "array", cellDates: true });

  const ASIA_SHEET = "【251001】アジア選手積算";
  const PARA_SHEET = "【251001】パラ選手積算";

  if (!wb.SheetNames.includes(ASIA_SHEET) || !wb.SheetNames.includes(PARA_SHEET)) {
    throw new Error(
      `対象シートが見つかりません。必要なシート: 「${ASIA_SHEET}」「${PARA_SHEET}」`
    );
  }

  function sheetRows(name: string): unknown[][] {
    return utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }) as unknown[][];
  }

  const asiaResult = parseSheet(sheetRows(ASIA_SHEET), "asia");
  const paraResult = parseSheet(sheetRows(PARA_SHEET), "para");

  const db: AllocationDB = {};

  function applySection(
    facilityNo: string,
    hotelName: string,
    group: "asia" | "para",
    section: AllocationSection
  ) {
    if (!db[facilityNo]) db[facilityNo] = { hotelName, asia: null, para: null };
    db[facilityNo][group] = section;
    if (!db[facilityNo].hotelName) db[facilityNo].hotelName = hotelName;
  }

  // Apply matched rows
  for (const r of asiaResult.matched) applySection(r.facilityNo, r.hotelName, "asia", r.section);
  for (const r of paraResult.matched) applySection(r.facilityNo, r.hotelName, "para", r.section);

  // Apply override mappings for previously-unmatched hotels
  const stillUnmatched: UnmatchedRow[] = [];
  for (const u of [...asiaResult.unmatched, ...paraResult.unmatched]) {
    const overrideFno = overrides[u.hotelName];
    if (overrideFno) {
      applySection(overrideFno, u.hotelName, u.group, u.section);
    } else {
      stillUnmatched.push(u);
    }
  }

  return {
    db,
    unmatched: stillUnmatched,
    asiaCount: asiaResult.matched.length + asiaResult.unmatched.filter((u) => overrides[u.hotelName]).length,
    paraCount: paraResult.matched.length + paraResult.unmatched.filter((u) => overrides[u.hotelName]).length,
  };
}
