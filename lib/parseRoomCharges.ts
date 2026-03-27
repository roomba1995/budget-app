/**
 * Browser-side parser for 別紙1-1 sheets in the accommodation cost Excel file.
 * Uses SheetJS (xlsx) loaded dynamically to avoid inflating the initial bundle.
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

export interface RoomChargeEntry {
  hotelName: string;
  asia: RoomChargeSection | null;
  para: RoomChargeSection | null;
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

// ── Section parser ────────────────────────────────────────────────────────────

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

    // Column indices (0-based):
    // A=0:No, B=1:チェックイン日, C=2:本番期間開始日, D=3:準備泊数, E=4:本番期間終了日, F=5:本番泊数,
    // G=6:チェックアウト日, H=7:撤去泊数, I=8:客室タイプ, J=9:総客室数, K=10:提供客室,
    // L=11:準備期間客室単価/室, M=12:本番期間客室単価/室, N=13:内部データ(skip),
    // O=14:撤去期間客室単価/室, P=15:ルームナイツ, Q=16:宿泊料金
    const colA = row[0];
    const colJ = row[9];
    const colK = row[10];
    const colM = row[12];
    const colP = row[15];
    const colQ = row[16];

    const strA = cellStr(colA);
    const strI = cellStr(row[8]);
    const rowText = (row as unknown[]).map((c) => cellStr(c)).join("");

    // ── Data rows: A = integer No., I = room type text ───────────────────────
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
      // Q列(16)=宿泊料金: Excel実値を優先、なければ計算で補完
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

    // ── 合計 row ──────────────────────────────────────────────────────────────
    if (strA.includes("合計") || strI.includes("合計")) {
      sumTotalRooms = toNum(colJ) ?? sumTotalRooms;
      sumOfferedRooms = toNum(colK) ?? sumOfferedRooms;
      sumRoomNights = toNum(colP) ?? sumRoomNights;
      continue;
    }

    // ── 1日あたり / 税込 rows ─────────────────────────────────────────────────
    // Scan entire row because label column shifts between hotels.
    // "1日あたり" label → first positive numeric value to its right is dailyCost.
    // "税込"  label appearing after foundDailyCost → same logic for dailyCostTax.
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

    // ── 総宿泊料金 rows ───────────────────────────────────────────────────────
    // Scan entire row for the value — column position varies between hotels.
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
      if (isTax) {
        totalCostTax = val;
      } else {
        totalCost = val;
      }
      continue;
    }
  }

  if (rooms.length === 0 && dailyCost === null) return null;

  const computedDailyCost = rooms.reduce((s, r) => s + r.dailyAmount, 0);

  return {
    rooms,
    totalRooms: sumTotalRooms || rooms.reduce((s, r) => s + r.totalRooms, 0),
    offeredRooms:
      sumOfferedRooms || rooms.reduce((s, r) => s + r.offeredRooms, 0),
    roomNights: sumRoomNights || rooms.reduce((s, r) => s + r.roomNights, 0),
    dailyCost: dailyCost ?? (computedDailyCost > 0 ? computedDailyCost : null),
    dailyCostTax,
    totalCost,
    totalCostTax,
  };
}

// ── Per-hotel parse helper ────────────────────────────────────────────────────

/**
 * Parse a per-hotel file that contains a single 別紙1-1 sheet.
 * Returns the facilityNo and entry, or an error string.
 */
export async function parseRoomChargesFromPerHotelFile(
  file: File
): Promise<{ facilityNo: string; entry: RoomChargeEntry } | { error: string }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetName = workbook.SheetNames.find((n) => n.includes("別紙1-1"));
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

export async function parseRoomChargesFromFile(
  file: File
): Promise<{ db: RoomChargesDB; count: number; errors: string[] }> {
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  // cellDates:true converts Excel date serials to JS Date objects
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const db: RoomChargesDB = {};
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!sheetName.includes("別紙1-1")) continue;

    // Sheet name format: "NNNN_ホテル名　別紙1-1" — extract the facility number
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

      // Hotel name is in row 2 (index 1), column C (A is the label "施設様名")
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
        paraStart >= 0
          ? parseSection(rows, paraStart + 1, rows.length)
          : null;

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
