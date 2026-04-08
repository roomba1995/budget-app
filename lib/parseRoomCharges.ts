/**
 * Browser-side parser for 別紙1-1 sheets in the accommodation cost Excel file.
 * Uses SheetJS (xlsx) loaded dynamically to avoid inflating the initial bundle.
 *
 * Supports three per-hotel Excel formats:
 *   Format A – standard athlete (客室タイプ at col 8, 提供客室 at col 10)
 *   Format B – 技術役員 (役職 col present; 客室タイプ at col 5, 提供客室 at col 7)
 *   Format C – simplified athlete with 日別 rows (客室タイプ at col 5, 提供客室 at col 7)
 */

export interface RoomRow {
  no: number;
  roomType: string;
  totalRooms: number;
  offeredRooms: number;
  checkin: string | null;
  mainStart: string | null;
  prepareDays: number | null;
  mainEnd: string | null;
  mainDays: number | null;
  checkout: string | null;
  removeDays: number | null;
  preparePrice: number | null;
  mainPrice: number | null;
  dailyAmount: number;
  removePrice: number | null;
  roomNights: number;
  lodgingFee: number | null;
  areaSqmMin: number | null;
  areaSqmMax: number | null;
  occupancy: number | null;
  bedSizeW: number | null;
  bedSizeH: number | null;
  bedCount: number | null;
  bath: string | null;
  lanWired: string | null;
  lanWireless: string | null;
  sonota: string | null;
  dailyOccupancyRef: number | null;
}

export interface RoomChargeSection {
  rooms: RoomRow[];
  totalRooms: number;
  offeredRooms: number;
  roomNights: number;
  dailyCost: number | null;
  dailyCostTax: number | null;
  totalCost: number | null;
  totalCostTax: number | null;
}

/** Four-way section key for per-hotel 予算執行 files */
export type RoomSectionKey =
  | "asia_athlete"
  | "para_athlete"
  | "asia_technical_official"
  | "para_technical_official";

export interface RoomChargeEntry {
  hotelName: string;
  // Legacy fields kept for backward-compat with multi-sheet upload
  asia?: RoomChargeSection | null;
  para?: RoomChargeSection | null;
  // Per-hotel 予算執行 sections (4-way)
  asia_athlete?: RoomChargeSection | null;
  para_athlete?: RoomChargeSection | null;
  asia_technical_official?: RoomChargeSection | null;
  para_technical_official?: RoomChargeSection | null;
}

export type RoomChargesDB = Record<string, RoomChargeEntry>;

export const ROOM_CHARGES_STORAGE_KEY = "room-charges-v2-uploaded";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

// ── Section detection ─────────────────────────────────────────────────────────

function findSectionStarts(rows: unknown[][]): { asiaStart: number; paraStart: number } {
  let asiaStart = -1;
  let paraStart = -1;

  for (let i = 0; i < rows.length; i++) {
    const rowText = (rows[i] ?? []).map((c) => cellStr(c)).join("");
    if (asiaStart < 0 && rowText.includes("アジア競技大会") && !rowText.includes("パラ")) {
      asiaStart = i;
    }
    if (
      paraStart < 0 &&
      (rowText.includes("パラ競技大会") ||
        (rowText.includes("アジアパラ") && rowText.includes("競技大会")))
    ) {
      paraStart = i;
    }
  }

  return { asiaStart, paraStart };
}

// ── Format detection ─────────────────────────────────────────────────────────

type ExcelFormat = "A" | "B" | "C";

/**
 * Detect the per-hotel format from the header rows near startRow.
 *   B → 役職 present in header
 *   C → 日別 present in header
 *   A → default
 */
function detectFormat(rows: unknown[][], startRow: number): ExcelFormat {
  for (let i = startRow; i < Math.min(startRow + 8, rows.length); i++) {
    const rt = (rows[i] ?? []).map((c) => cellStr(c)).join("");
    if (rt.includes("役職")) return "B";
    if (rt.includes("日別")) return "C";
  }
  return "A";
}

// ── Per-hotel section parser (multi-format) ───────────────────────────────────

function parseSectionByFormat(
  rows: unknown[][],
  startRow: number,
  endRow: number,
  format: ExcelFormat
): RoomChargeSection | null {
  const rooms: RoomRow[] = [];
  let sumTotalRooms = 0;
  let sumOfferedRooms = 0;
  let sumRoomNights = 0;
  let totalCost: number | null = null;
  let totalCostTax: number | null = null;

  for (let i = startRow; i < Math.min(endRow, rows.length); i++) {
    const row = rows[i] ?? [];
    const colA = row[0];
    const rowText = (row as unknown[]).map((c) => cellStr(c)).join("");

    if (rowText.includes("記入例")) continue;

    // ── データ行 ─────────────────────────────────────────────────────────────
    if (typeof colA === "number" && Number.isInteger(colA) && colA > 0 && colA <= 200) {
      let roomRow: RoomRow | null = null;

      if (format === "A") {
        // Col layout: 0=No, 1=CI, 2=本番開始, 3=準備泊, 4=本番終了, 5=本番泊,
        //             6=CO, 7=撤去泊, 8=客室タイプ, 9=総客室数, 10=提供客室,
        //             11=準備単価, 12=本番単価, 13=撤去単価, 14=RN, 15=宿泊料金,
        //             16=広さmin, 17=～, 18=広さmax, 19=利用人数
        const roomType = cellStr(row[8]);
        if (!roomType) continue;
        const offered = toNum(row[10]) ?? 0;
        const prepareDays = toNum(row[3]);
        const mainDays = toNum(row[5]);
        const removeDays = toNum(row[7]);
        const preparePrice = toNum(row[11]);
        const mainPrice = toNum(row[12]);
        const removePrice = toNum(row[13]);
        const roomNights = toNum(row[14]) ?? 0;
        const lodgingFee = toNum(row[15]);
        roomRow = {
          no: colA, roomType,
          totalRooms: toNum(row[9]) ?? 0,
          offeredRooms: offered,
          checkin: formatDate(row[1]),
          mainStart: formatDate(row[2]),
          prepareDays,
          mainEnd: formatDate(row[4]),
          mainDays,
          checkout: formatDate(row[6]),
          removeDays,
          preparePrice, mainPrice,
          dailyAmount: mainPrice != null && offered > 0 ? mainPrice * offered : 0,
          removePrice, roomNights, lodgingFee,
          areaSqmMin: toNum(row[16]), areaSqmMax: toNum(row[18]),
          occupancy: toNum(row[19]),
          bedSizeW: null, bedSizeH: null, bedCount: null,
          bath: null, lanWired: null, lanWireless: null, sonota: null,
          dailyOccupancyRef: null,
        };
      } else if (format === "B") {
        // Col layout: 0=No, 1=役職, 2=CI, 3=CO, 4=泊数, 5=客室タイプ,
        //             6=総客室数, 7=提供客室, 8=単価/室, 9=RN, 10=宿泊料金,
        //             11=広さmin, 12=～, 13=広さmax, 14=利用人数,
        //             15=ベッドサイズ1, 17=ベッドサイズ2, 18=ベッド数, 19=浴室
        const roomType = cellStr(row[5]);
        if (!roomType) continue;
        const offered = toNum(row[7]) ?? 0;
        const mainDays = toNum(row[4]);
        const mainPrice = toNum(row[8]);
        const roomNights = toNum(row[9]) ?? 0;
        const lodgingFee = toNum(row[10]);
        roomRow = {
          no: colA, roomType,
          totalRooms: toNum(row[6]) ?? 0,
          offeredRooms: offered,
          checkin: formatDate(row[2]),
          mainStart: null, prepareDays: null,
          mainEnd: null, mainDays,
          checkout: formatDate(row[3]),
          removeDays: null,
          preparePrice: null, mainPrice,
          dailyAmount: mainPrice != null && offered > 0 ? mainPrice * offered : 0,
          removePrice: null, roomNights, lodgingFee,
          areaSqmMin: toNum(row[11]), areaSqmMax: toNum(row[13]),
          occupancy: toNum(row[14]),
          bedSizeW: toNum(row[15]), bedSizeH: toNum(row[17]),
          bedCount: toNum(row[18]),
          bath: cellStr(row[19]) || null,
          lanWired: null, lanWireless: null, sonota: null,
          dailyOccupancyRef: null,
        };
      } else {
        // Format C: 0=No, 1=CI, 2=CO, 3=日別(平日/休前日), 4=泊数, 5=客室タイプ,
        //           6=総客室数, 7=提供客室, 8=単価/室, 9=RN, 10=宿泊料金,
        //           11=利用人数
        const roomType = cellStr(row[5]);
        if (!roomType) continue;
        const offered = toNum(row[7]) ?? 0;
        const mainDays = toNum(row[4]);
        const mainPrice = toNum(row[8]);
        const roomNights = toNum(row[9]) ?? 0;
        const lodgingFee = toNum(row[10]);
        const dailyType = cellStr(row[3]);
        roomRow = {
          no: colA,
          roomType: roomType + (dailyType ? `（${dailyType}）` : ""),
          totalRooms: toNum(row[6]) ?? 0,
          offeredRooms: offered,
          checkin: formatDate(row[1]),
          mainStart: null, prepareDays: null,
          mainEnd: null, mainDays,
          checkout: formatDate(row[2]),
          removeDays: null,
          preparePrice: null, mainPrice,
          dailyAmount: mainPrice != null && offered > 0 ? mainPrice * offered : 0,
          removePrice: null, roomNights, lodgingFee,
          areaSqmMin: null, areaSqmMax: null,
          occupancy: toNum(row[11]),
          bedSizeW: null, bedSizeH: null, bedCount: null,
          bath: null, lanWired: null, lanWireless: null, sonota: null,
          dailyOccupancyRef: null,
        };
      }

      if (roomRow) rooms.push(roomRow);
      continue;
    }

    // ── 合計行 ──────────────────────────────────────────────────────────────
    if (rowText.includes("合計") && !rowText.includes("総") && !rowText.includes("料金")) {
      if (format === "A") {
        sumTotalRooms = toNum(row[9]) ?? sumTotalRooms;
        sumOfferedRooms = toNum(row[10]) ?? sumOfferedRooms;
        sumRoomNights = toNum(row[14]) ?? sumRoomNights;
      } else {
        sumTotalRooms = toNum(row[6]) ?? sumTotalRooms;
        sumOfferedRooms = toNum(row[7]) ?? sumOfferedRooms;
        sumRoomNights = toNum(row[9]) ?? sumRoomNights;
      }
      continue;
    }

    // ── 総宿泊料金 ──────────────────────────────────────────────────────────
    if (rowText.includes("総宿泊料金") || rowText.includes("宿泊料金合計") || rowText.includes("客室確保費合計")) {
      const isTax =
        rowText.includes("税込") ||
        rowText.includes("税サ込") ||
        rowText.includes("サ込税") ||
        rowText.includes("税S込");
      let val: number | null = null;
      for (let c = 1; c < row.length; c++) {
        const n = toNum(row[c]);
        if (n != null && n > 0) { val = n; break; }
      }
      if (val != null) {
        if (isTax) totalCostTax = val;
        else totalCost = val;
      }
      continue;
    }
  }

  if (rooms.length === 0) return null;

  return {
    rooms,
    totalRooms: sumTotalRooms || rooms.reduce((s, r) => s + r.totalRooms, 0),
    offeredRooms: sumOfferedRooms || rooms.reduce((s, r) => s + r.offeredRooms, 0),
    roomNights: sumRoomNights || rooms.reduce((s, r) => s + r.roomNights, 0),
    dailyCost: null,
    dailyCostTax: null,
    totalCost,
    totalCostTax,
  };
}

// ── Legacy multi-sheet section parser (preserved for 宿泊費積算根拠.xlsx upload) ──

function parseSection(
  rows: unknown[][],
  startRow: number,
  endRow: number
): RoomChargeSection | null {
  const rooms: RoomRow[] = [];
  let sumTotalRooms = 0;
  let sumOfferedRooms = 0;
  let sumRoomNights = 0;
  let dailyCost: number | null = null;
  let dailyCostTax: number | null = null;
  let totalCost: number | null = null;
  let totalCostTax: number | null = null;
  let foundDailyCost = false;

  for (let i = startRow; i < Math.min(endRow, rows.length); i++) {
    const row = rows[i] ?? [];

    // Column indices for the large 宿泊費積算根拠.xlsx file:
    // A=0:No, B=1:CI, C=2:本番開始, D=3:準備泊, E=4:本番終了, F=5:本番泊,
    // G=6:CO, H=7:撤去泊, I=8:客室タイプ, J=9:総客室数, K=10:提供客室,
    // L=11:準備単価, M=12:本番単価, N=13:内部(skip), O=14:撤去単価,
    // P=15:RN, Q=16:宿泊料金
    const colA = row[0];
    const colJ = row[9];
    const colK = row[10];
    const colM = row[12];
    const colP = row[15];
    const colQ = row[16];

    const strA = cellStr(colA);
    const strI = cellStr(row[8]);
    const rowText = (row as unknown[]).map((c) => cellStr(c)).join("");

    if (
      typeof colA === "number" &&
      Number.isInteger(colA) &&
      colA > 0 &&
      colA <= 50 &&
      strI &&
      !strI.includes("記入例")
    ) {
      const mainPrice = toNum(colM);
      const offered = toNum(colK) ?? 0;
      const prepareDays = toNum(row[3]);
      const mainDays = toNum(row[5]);
      const removeDays = toNum(row[7]);
      const preparePrice = toNum(row[11]);
      const removePrice = toNum(row[14]);
      const lodgingFeeRaw = toNum(colQ);
      const lodgingFeeCalc =
        (preparePrice != null && prepareDays != null ? preparePrice * prepareDays * offered : 0) +
        (mainPrice != null && mainDays != null ? mainPrice * mainDays * offered : 0) +
        (removePrice != null && removeDays != null ? removePrice * removeDays * offered : 0);
      const lodgingFee = lodgingFeeRaw ?? (lodgingFeeCalc > 0 ? lodgingFeeCalc : null);
      rooms.push({
        no: colA,
        roomType: strI,
        totalRooms: toNum(colJ) ?? 0,
        offeredRooms: offered,
        checkin: formatDate(row[1]),
        mainStart: formatDate(row[2]),
        prepareDays,
        mainEnd: formatDate(row[4]),
        mainDays,
        checkout: formatDate(row[6]),
        removeDays,
        preparePrice,
        mainPrice,
        dailyAmount: mainPrice != null && offered > 0 ? mainPrice * offered : 0,
        removePrice,
        roomNights: toNum(colP) ?? 0,
        lodgingFee,
        areaSqmMin: toNum(row[17]),
        areaSqmMax: toNum(row[19]),
        occupancy: toNum(row[20]),
        bedSizeW: toNum(row[21]),
        bedSizeH: toNum(row[23]),
        bedCount: toNum(row[24]),
        bath: cellStr(row[25]) || null,
        lanWired: cellStr(row[27]) || null,
        lanWireless: cellStr(row[29]) || null,
        sonota: cellStr(row[30]) || null,
        dailyOccupancyRef: toNum(row[31]),
      });
      continue;
    }

    if (strA === "合計" || strI === "合計") {
      sumTotalRooms = toNum(colJ) ?? sumTotalRooms;
      sumOfferedRooms = toNum(colK) ?? sumOfferedRooms;
      sumRoomNights = toNum(colP) ?? sumRoomNights;
      continue;
    }

    {
      let matchedDailyRow = false;
      let matchedTaxRow = false;
      for (let c = 0; c < row.length - 1; c++) {
        const lbl = cellStr(row[c]);
        if (!foundDailyCost && (lbl.includes("1日あたり") || lbl.includes("１日あたり"))) {
          for (let v = c + 1; v < row.length; v++) {
            const n = toNum(row[v]);
            if (n != null && n > 0) { dailyCost = n; foundDailyCost = true; matchedDailyRow = true; break; }
          }
        }
        if (foundDailyCost && !matchedTaxRow && (lbl === "税込" || (lbl.includes("税込") && !lbl.includes("総")))) {
          for (let v = c + 1; v < row.length; v++) {
            const n = toNum(row[v]);
            if (n != null && n > 0) { dailyCostTax = n; matchedTaxRow = true; break; }
          }
        }
      }
      if (matchedDailyRow || matchedTaxRow) continue;
    }

    if (rowText.includes("総宿泊料金") || rowText.includes("宿泊料金合計") || rowText.includes("客室確保費合計")) {
      let val: number | null = null;
      for (let c = 1; c < row.length; c++) {
        const n = toNum(row[c]);
        if (n != null && n > 0) { val = n; break; }
      }
      const isTax =
        rowText.includes("税込") ||
        rowText.includes("税サ込") ||
        rowText.includes("サ込税");
      if (val != null) {
        if (isTax) { totalCostTax = val; }
        else { totalCost = val; }
      }
      continue;
    }
  }

  if (rooms.length === 0 && dailyCost === null) return null;

  const computedDailyCost = rooms.reduce((s, r) => s + r.dailyAmount, 0);
  const computedTotalCost = rooms.reduce((s, r) => s + (r.lodgingFee ?? 0), 0);

  return {
    rooms,
    totalRooms: sumTotalRooms || rooms.reduce((s, r) => s + r.totalRooms, 0),
    offeredRooms: sumOfferedRooms || rooms.reduce((s, r) => s + r.offeredRooms, 0),
    roomNights: sumRoomNights || rooms.reduce((s, r) => s + r.roomNights, 0),
    dailyCost: dailyCost ?? (computedDailyCost > 0 ? computedDailyCost : null),
    dailyCostTax,
    totalCost: totalCost ?? (totalCostTax == null && computedTotalCost > 0 ? computedTotalCost : null),
    totalCostTax,
  };
}

// ── Per-hotel parse helper ────────────────────────────────────────────────────

/**
 * Parse a per-hotel 予算執行 file (別紙1-1 sheet).
 * Detects format (A/B/C) and assigns sections to 4-way keys.
 */
export async function parseRoomChargesFromPerHotelFile(
  file: File,
  overrideSheetName?: string
): Promise<{ facilityNo: string; entry: RoomChargeEntry } | { error: string }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetName =
    overrideSheetName ??
    workbook.SheetNames.find((n) => n.includes("別紙1-1"));
  if (!sheetName) return { error: "別紙1-1シートが見つかりません" };

  const match = sheetName.match(/^0*(\d+)[_　\s]/);
  if (!match) return { error: `"${sheetName}": 施設番号を抽出できません` };
  const facilityNo = match[1];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  }) as unknown[][];

  // Hotel name: try col 2 then col 3 in row 2 (index 1)
  const row1 = rows[1] ?? [];
  const hotelName =
    cellStr(row1[2]) || cellStr(row1[3]) || cellStr(row1[0]) || "";

  const { asiaStart, paraStart } = findSectionStarts(rows);
  if (asiaStart < 0 && paraStart < 0) return { error: "セクションが見つかりません" };

  // Detect format from the first section's header rows
  const firstSectionStart = asiaStart >= 0 ? asiaStart : paraStart;
  const format = detectFormat(rows, firstSectionStart);
  const participantType = format === "B" ? "technical_official" : "athlete";

  const asiaEnd = paraStart >= 0 ? paraStart : rows.length;
  const asiaSection =
    asiaStart >= 0 ? parseSectionByFormat(rows, asiaStart + 1, asiaEnd, format) : null;
  const paraSection =
    paraStart >= 0 ? parseSectionByFormat(rows, paraStart + 1, rows.length, format) : null;

  if (!asiaSection && !paraSection) return { error: "データが見つかりません" };

  const entry: RoomChargeEntry = { hotelName };
  if (asiaSection) {
    if (participantType === "athlete") entry.asia_athlete = asiaSection;
    else entry.asia_technical_official = asiaSection;
  }
  if (paraSection) {
    if (participantType === "athlete") entry.para_athlete = paraSection;
    else entry.para_technical_official = paraSection;
  }

  return { facilityNo, entry };
}

// ── Extract hotel name from Excel (C2/D2 cell) ───────────────────────────────

/**
 * Extract the hotel name from C2 or D2 cell of a per-hotel 別紙1-1 Excel file.
 */
export async function extractHotelNameFromExcel(file: File): Promise<string | null> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => n.includes("別紙1-1") || n.includes("別紙1-2")) ??
    wb.SheetNames[0];
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  // Try C2, D2, B2, C3 in order
  const name =
    ws["C2"]?.v ?? ws["D2"]?.v ?? ws["B2"]?.v ?? ws["C3"]?.v ?? null;
  return name ? String(name).trim() : null;
}

// ── Sheet info helper ────────────────────────────────────────────────────────

export async function getExcelSheetInfo(file: File): Promise<{ rcSheets: string[]; mrSheets: string[] }> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return {
    rcSheets: wb.SheetNames.filter((n) => n.includes("別紙1-1")),
    mrSheets: wb.SheetNames.filter((n) => n.includes("別紙1-2")),
  };
}

// ── Public API (multi-sheet 宿泊費積算根拠.xlsx upload) ───────────────────────

export async function parseRoomChargesFromFile(
  file: File
): Promise<{ db: RoomChargesDB; count: number; errors: string[] }> {
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const db: RoomChargesDB = {};
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!sheetName.includes("別紙1-1")) continue;

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
      const asia =
        asiaStart >= 0 ? parseSection(rows, asiaStart + 1, asiaEnd) : null;
      const para =
        paraStart >= 0 ? parseSection(rows, paraStart + 1, rows.length) : null;

      if (!asia && !para) {
        errors.push(`"${sheetName}": データが見つかりません`);
        continue;
      }

      db[facilityNo] = { hotelName, asia, para };
    } catch (e) {
      errors.push(
        `"${sheetName}": ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return { db, count: Object.keys(db).length, errors };
}
