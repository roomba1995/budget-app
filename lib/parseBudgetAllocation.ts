/**
 * Parser for 積算シート (【251001】アジア選手積算 / 【251001】パラ選手積算).
 *
 * Column mapping (0-based, row index 3 = header):
 *   0: 通し番号  1: 施設番号  2: 宿泊施設名
 *   3: 一日あたり客室総額(税込)   4: アスリートミール単価(通常)  5: (ハラル)  7: G&G単価
 *   8: 利用想定客室数  10: 一日あたりファンクション総額(税込)
 *  11: 客室総計(税込)  12: ファンクション総計(税込)
 *  13: 差額朝食加算  14: ３食合計(通常)  15: ３食合計(ハラル)  16: G&G合計
 *  17: 入湯税  18: 扉外し  19: 営業補償等  20: クリーンベニュー(機器)
 *  21: クリーンベニュー(テナント)  22: キャンセルポリシー
 *  23: 施設合計  24: 開始日(Y)  25: 終了日(Z)  26: 確保泊数(AA)  27: 延べ人泊数(AB)
 */

export interface AllocationSection {
  dailyRoom: number | null;          // D col 3
  mealPriceNormal: number | null;    // E col 4
  mealPriceHalal: number | null;     // F col 5
  grabAndGoPrice: number | null;     // H col 7
  rooms: number | null;              // col 8
  dailyFunc: number | null;          // K col 10
  roomTotal: number | null;          // L col 11
  funcTotal: number | null;          // M col 12
  mealBreakfastAddon: number | null; // N col 13
  mealTotalNormal: number | null;    // O col 14
  mealTotalHalal: number | null;     // P col 15
  grabAndGoTotal: number | null;     // Q col 16
  bathTax: number | null;            // R col 17
  doorRemoval: number | null;        // S col 18 (扉外し)
  businessComp: number | null;       // T col 19 (営業補償等)
  cleanVenueMachine: number | null;  // U col 20 (クリーンベニュー機器)
  cleanVenueTenant: number | null;   // V col 21 (クリーンベニューテナント)
  cancelPolicyAmount: number | null; // W col 22 (キャンセルポリシー)
  facilityTotal: number | null;      // X col 23
  startDate: string | null;          // Y col 24
  endDate: string | null;            // Z col 25
  nights: number | null;             // AA col 26
  extendedNights: number | null;     // AB col 27
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
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    if (v.includes("T")) return v.slice(0, 10);
    // e.g. "2026-09-13" already
    if (/^d{4}-d{2}-d{2}$/.test(v)) return v;
  }
  if (typeof v === "number" && !isNaN(v) && v > 0) {
    // Excel date serial number: days since 1899-12-30
    const ms = (v - 25569) * 86400 * 1000; // 25569 = Excel serial for 1970-01-01
    const date = new Date(ms);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }
  return null;
}

function normFacilityNo(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? s : String(n);
}

// ── main parser ─────────────────────────────────────────────────��─────────────

function parseSheet(
  rows: unknown[][],
  group: "asia" | "para"
): { matched: Array<{ facilityNo: string; hotelName: string; section: AllocationSection }>; unmatched: UnmatchedRow[] } {
  const matched: Array<{ facilityNo: string; hotelName: string; section: AllocationSection }> = [];
  const unmatched: UnmatchedRow[] = [];

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const colA = (row as unknown[])[0];
    const colANum = typeof colA === "number" ? colA : (typeof colA === "string" ? Number(colA.trim()) : NaN);
    if (!Number.isFinite(colANum) || !Number.isInteger(colANum) || colANum <= 0) {
      // Debug: log skipped rows that have a facilityNo in col B (to catch hotels being skipped)
      const colB = (row as unknown[])[1];
      if (typeof window !== "undefined" && colB !== null && colB !== undefined && colB !== "") {
        console.warn(`[parseSheet skip][${group}] row ${i}: colA=${JSON.stringify(colA)} colB=${JSON.stringify(colB)} colC=${JSON.stringify((row as unknown[])[2])}`);
      }
      continue;
    }

    const no = colANum;
    const facilityNo = normFacilityNo((row as unknown[])[1]);
    const hotelName = cellStr((row as unknown[])[2]);

    const section: AllocationSection = {
      dailyRoom: toNum((row as unknown[])[3]),
      mealPriceNormal: toNum((row as unknown[])[4]),
      mealPriceHalal: toNum((row as unknown[])[5]),
      grabAndGoPrice: toNum((row as unknown[])[7]),
      rooms: toNum((row as unknown[])[8]),
      dailyFunc: toNum((row as unknown[])[10]),
      roomTotal: toNum((row as unknown[])[11]),
      funcTotal: toNum((row as unknown[])[12]),
      mealBreakfastAddon: toNum((row as unknown[])[13]),
      mealTotalNormal: toNum((row as unknown[])[14]),
      mealTotalHalal: toNum((row as unknown[])[15]),
      grabAndGoTotal: toNum((row as unknown[])[16]),
      bathTax: toNum((row as unknown[])[17]),
      doorRemoval: toNum((row as unknown[])[18]),     // S: 扉外し
      businessComp: toNum((row as unknown[])[19]),    // T: 営業補償等
      cleanVenueMachine: toNum((row as unknown[])[20]),  // U: クリーンベニュー機器
      cleanVenueTenant: toNum((row as unknown[])[21]),   // V: クリーンベニューテナント
      cancelPolicyAmount: toNum((row as unknown[])[22]), // W: キャンセルポリシー
      facilityTotal: toNum((row as unknown[])[23]),
      startDate: formatDateValue((row as unknown[])[24]),
      endDate: formatDateValue((row as unknown[])[25]),
      nights: toNum((row as unknown[])[26]),
      extendedNights: toNum((row as unknown[])[27]),
    };

    // Debug: log rows where all numeric fields are null
    if (typeof window !== "undefined") {
      const keyNums = [section.roomTotal, section.funcTotal, section.mealBreakfastAddon, section.dailyRoom];
      if (keyNums.every(v => v === null)) {
        console.warn(`[parseBudgetAllocation] row ${i}: all key numeric fields null — hotelName="${hotelName}" facilityNo="${facilityNo}"`);
        console.warn(`[parseBudgetAllocation] row ${i} raw (cols 0-27):`, (row as unknown[]).slice(0, 28));
      }
      // Debug: always log facilityNo=20 row to diagnose あいち健康の森
      if (facilityNo === "20") {
        console.log(`[parseBudgetAllocation] facilityNo=20 found at row ${i}: roomTotal=${section.roomTotal} funcTotal=${section.funcTotal} mealBreakfastAddon=${section.mealBreakfastAddon}`);
        console.log(`[parseBudgetAllocation] facilityNo=20 raw (cols 0-27):`, (row as unknown[]).slice(0, 28));
      }
    }

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

  if (typeof window !== "undefined") {
    console.log("[paraDebug] パラシート matched facilityNos:", paraResult.matched.map(r => `${r.facilityNo}:${r.hotelName}`));
    console.log("[paraDebug] パラシート unmatched:", paraResult.unmatched.map(r => `facilityNo="${r.facilityNo}" name="${r.hotelName}"`));
  }

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
