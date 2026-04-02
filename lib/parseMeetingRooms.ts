/**
 * Browser-side parser for 別紙1-2 sheets (function rooms / meeting rooms).
 * Column mapping (0-based):
 * A=0:No, B=1:利用開始日, C=2:利用終了日, D=3:利用開始時間, E=4:利用終了時間,
 * F=5:利用日数, G=6:会場名, H=7:階数, I=8:会場形態, J=9:たて(m), K=10:よこ(m),
 * L=11:広さ(㎡), M=12:天井高(m), N=13:料金※サ込税別, O=14:料金計※サ込税別,
 * P=15:分割可否, Q=16:分割数, R=17:有線LAN, S=18:有線LAN料金, T=19:無線LAN
 */

export interface MeetingRoomRow {
  no: number;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  usageDays: number | null;
  venueName: string;
  floor: string | null;
  venueType: string | null;
  lengthM: number | null;
  widthM: number | null;
  areaSqm: number | null;
  ceilingHeightM: number | null;
  pricePerDay: number | null;
  totalPrice: number | null;
  splitAvailable: string | null;
  splitCount: number | null;
  lanWired: string | null;
  lanWiredPrice: number | null;
  lanWireless: string | null;
  lanWirelessPrice: number | null;
  sonota: string | null;
}

export interface MeetingRoomSection {
  rooms: MeetingRoomRow[];
  totalDays: number | null;
  dailyCost: number | null;
  dailyCostTax: number | null;
  totalCost: number | null;
  totalCostTax: number | null;
}

export interface MeetingRoomEntry {
  hotelName: string;
  asia: MeetingRoomSection | null;
  para: MeetingRoomSection | null;
}

export type MeetingRoomsDB = Record<string, MeetingRoomEntry>;
export const MEETING_ROOMS_STORAGE_KEY = "meeting-rooms-v1-uploaded";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cellStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v.replace(/[,¥，]/g, "").trim());
    return isNaN(n) ? null : n;
  }
  return null;
}

function formatDate(v: unknown): string | null {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

function formatTime(v: unknown): string | null {
  if (v instanceof Date) {
    // SheetJS with cellDates:true returns time-only values as Date at 1899-12-30
    const h = v.getHours();
    const m = v.getMinutes();
    // Check if it's actually a "full day" value (date > epoch means 24:00+)
    if (v.getFullYear() >= 1900 && v.getDate() !== 30) {
      const totalH = (v.getDate() - 30) * 24 + h;
      return `${totalH}:${String(m).padStart(2, "0")}`;
    }
    return `${h}:${String(m).padStart(2, "0")}`;
  }
  if (typeof v === "number" && isFinite(v) && v >= 0) {
    // Raw fractional day (0–1+)
    const totalMin = Math.round(v * 24 * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  }
  return null;
}

// ── Section detection ─────────────────────────────────────────────────────────

function findSectionStarts(rows: unknown[][]): { asiaStart: number; paraStart: number } {
  let asiaStart = -1;
  let paraStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const text = (rows[i] ?? []).map((c) => cellStr(c)).join("");
    if (asiaStart < 0 && text.includes("アジア競技大会") && text.includes("ファンクション") && !text.includes("パラ")) {
      asiaStart = i;
    }
    if (
      paraStart < 0 &&
      text.includes("ファンクション") &&
      (text.includes("パラ競技大会") || (text.includes("アジアパラ") && text.includes("競技大会")))
    ) {
      paraStart = i;
    }
  }
  return { asiaStart, paraStart };
}

// ── Section parser ────────────────────────────────────────────────────────────

function parseSection(rows: unknown[][], startRow: number, endRow: number): MeetingRoomSection | null {
  const rooms: MeetingRoomRow[] = [];
  let totalDays: number | null = null;
  let dailyCost: number | null = null;
  let dailyCostTax: number | null = null;
  let totalCost: number | null = null;
  let totalCostTax: number | null = null;
  let foundDailyCost = false;

  for (let i = startRow; i < Math.min(endRow, rows.length); i++) {
    const row = rows[i] ?? [];
    const g = (idx: number) => (row as unknown[])[idx] ?? null;
    const colA = g(0);
    const strA = cellStr(colA);
    const strG = cellStr(g(6)); // 会場名
    const strM = cellStr(g(12)); // 天井高 / label
    const rowText = (row as unknown[]).map((c) => cellStr(c)).join("");

    // ── Data rows: A = integer No., G = venue name ────────────────────────────
    if (
      typeof colA === "number" &&
      Number.isInteger(colA) &&
      colA > 0 &&
      colA <= 100 &&
      strG &&
      !strG.includes("記入例")
    ) {
      rooms.push({
        no: colA,
        startDate: formatDate(g(1)),
        endDate: formatDate(g(2)),
        startTime: formatTime(g(3)),
        endTime: formatTime(g(4)),
        usageDays: toNum(g(5)),
        venueName: strG,
        floor: cellStr(g(7)) || null,
        venueType: cellStr(g(8)) || null,
        lengthM: toNum(g(9)),
        widthM: toNum(g(10)),
        areaSqm: toNum(g(11)),
        ceilingHeightM: toNum(g(12)),
        pricePerDay: toNum(g(13)),
        totalPrice: toNum(g(14)),
        splitAvailable: cellStr(g(15)) || null,
        splitCount: toNum(g(16)),
        lanWired: cellStr(g(17)) || null,
        lanWiredPrice: toNum(g(18)),
        lanWireless: cellStr(g(19)) || null,
        lanWirelessPrice: toNum(g(20)),
        sonota: cellStr(g(21)) || null,
      });
      continue;
    }

    // ── 合計 row ──────────────────────────────────────────────────────────────
    if (strA.includes("合計") && !strA.includes("税")) {
      totalDays = toNum(g(5)) ?? totalDays;
      totalCost = toNum(g(14)) ?? totalCost;
      continue;
    }

    // ── 合計（税サ込）row ──────────────────────────────────────────────────────
    if (strA.includes("合計") && (strA.includes("税") || rowText.includes("税サ込"))) {
      totalCostTax = toNum(g(14)) ?? totalCostTax;
      continue;
    }

    // ── 1日あたり row (label in M col = index 12) ─────────────────────────────
    if (strM.includes("1日あたり") || strM.includes("１日あたり")) {
      dailyCost = toNum(g(13));
      foundDailyCost = true;
      continue;
    }

    // ── 税込 row ──────────────────────────────────────────────────────────────
    if (foundDailyCost && (strM === "税込" || strM.includes("税込"))) {
      dailyCostTax = toNum(g(13));
      continue;
    }
  }

  if (rooms.length === 0 && totalCost === null) return null;

  return { rooms, totalDays, dailyCost, dailyCostTax, totalCost, totalCostTax };
}

// ── Per-hotel parse helper ────────────────────────────────────────────────────

/**
 * Parse a per-hotel file that contains a single 別紙1-2 sheet.
 * Returns the facilityNo and entry, or an error string.
 */
export async function parseMeetingRoomsFromPerHotelFile(
  file: File,
  overrideSheetName?: string
): Promise<{ facilityNo: string; entry: MeetingRoomEntry } | { error: string }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetName = overrideSheetName ?? workbook.SheetNames.find((n) => n.includes("別紙1-2"));
  if (!sheetName) return { error: "別紙1-2シートが見つかりません" };

  const match = sheetName.match(/^0*(\d+)[_　\s]/);
  if (!match) return { error: `"${sheetName}": 施設番号を抽出できません` };
  const facilityNo = match[1];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  }) as unknown[][];

  const row1 = rows[1] ?? [];
  const hotelName = cellStr(row1[2]) || cellStr(row1[0]) || "";

  const { asiaStart, paraStart } = findSectionStarts(rows);
  if (asiaStart < 0 && paraStart < 0) return { error: "セクションが見つかりません" };

  const asiaEnd = paraStart >= 0 ? paraStart : rows.length;
  const asia = asiaStart >= 0 ? parseSection(rows, asiaStart + 1, asiaEnd) : null;
  const para = paraStart >= 0 ? parseSection(rows, paraStart + 1, rows.length) : null;

  if (!asia && !para) return { error: "データが見つかりません" };

  return { facilityNo, entry: { hotelName, asia, para } };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function parseMeetingRoomsFromFile(
  file: File
): Promise<{ db: MeetingRoomsDB; count: number; errors: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const db: MeetingRoomsDB = {};
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!sheetName.includes("別紙1-2")) continue;

    const match = sheetName.match(/^0*(\d+)[_　\s]/);
    if (!match) {
      errors.push(`"${sheetName}": 施設番号を抽出できません`);
      continue;
    }
    const facilityNo = match[1];

    try {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: null,
      }) as unknown[][];

      const row1 = rows[1] ?? [];
      const hotelName = cellStr(row1[2]) || cellStr(row1[0]) || "";

      const { asiaStart, paraStart } = findSectionStarts(rows);
      if (asiaStart < 0 && paraStart < 0) {
        errors.push(`"${sheetName}": セクションが見つかりません`);
        continue;
      }

      const asiaEnd = paraStart >= 0 ? paraStart : rows.length;
      const asia = asiaStart >= 0 ? parseSection(rows, asiaStart + 1, asiaEnd) : null;
      const para = paraStart >= 0 ? parseSection(rows, paraStart + 1, rows.length) : null;

      if (!asia && !para) {
        errors.push(`"${sheetName}": データが見つかりません`);
        continue;
      }

      db[facilityNo] = { hotelName, asia, para };
    } catch (e) {
      errors.push(`"${sheetName}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { db, count: Object.keys(db).length, errors };
}
