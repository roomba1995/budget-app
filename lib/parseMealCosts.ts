/**
 * Browser-side parser for 別紙2 sheets (meal costs / 飲食費).
 * Column mapping (0-based) for data rows:
 * B=1:食事カテゴリー, C=2:食事種類, D=3:Basic単価, E=4:Halal/vegan単価,
 * F=5:合計食数, G=6:料金※A, J=9:合計ラベル, K=10:合計値/飲食提供料金
 */

export interface MealRow {
  category: string;      // 食事カテゴリー (B)
  mealType: string;      // 食事種類 (C)
  unitPriceBasic: number | null;   // Basic単価 (D)
  unitPriceHalal: number | null;   // Halal/vegan単価 (E)
  totalMeals: number | null;       // 合計食数 (F)
  totalAmount: number | null;      // 料金※A (G)
}

export interface MealCostSection {
  rows: MealRow[];
  totalTaxExcluded: number | null;
  totalTaxIncluded: number | null;
}

export interface MealCostEntry {
  hotelName: string;
  asia: MealCostSection | null;
  para: MealCostSection | null;
}

export type MealCostsDB = Record<string, MealCostEntry>;
export const MEAL_COSTS_STORAGE_KEY = "meal-costs-v1-uploaded";

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

// ── Section detection ─────────────────────────────────────────────────────────

function findSectionStarts(rows: unknown[][]): { asiaStart: number; paraStart: number } {
  let asiaStart = -1;
  let paraStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const text = (rows[i] ?? []).map((c) => cellStr(c)).join("");
    if (asiaStart < 0 && text.includes("アジア競技大会") && !text.includes("パラ")) {
      asiaStart = i;
    }
    if (
      paraStart < 0 &&
      (text.includes("パラ競技大会") || (text.includes("アジアパラ") && text.includes("競技大会")))
    ) {
      paraStart = i;
    }
  }
  return { asiaStart, paraStart };
}

// ── Section parser ────────────────────────────────────────────────────────────

function parseSection(rows: unknown[][], startRow: number, endRow: number): MealCostSection | null {
  const mealRows: MealRow[] = [];
  let totalTaxExcluded: number | null = null;
  let totalTaxIncluded: number | null = null;

  for (let i = startRow; i < Math.min(endRow, rows.length); i++) {
    const row = rows[i] ?? [];
    const g = (idx: number) => (row as unknown[])[idx] ?? null;

    const colB = cellStr(g(1)); // 食事カテゴリー
    const colC = cellStr(g(2)); // 食事種類
    const rowText = (row as unknown[]).map((c) => cellStr(c)).join("");

    // ── Summary rows: 計（税別）and 計（税込）─────────────────────────────────
    // Label at J(9), value at K(10)
    if (rowText.includes("計（税別）") || rowText.includes("計(税別)") || rowText.includes("飲食提供料金計（税別）")) {
      const val = toNum(g(10));
      if (val != null) totalTaxExcluded = val;
      continue;
    }
    if (rowText.includes("計（税込）") || rowText.includes("計(税込)") || rowText.includes("飲食提供料金計（税込）")) {
      const val = toNum(g(10));
      if (val != null) totalTaxIncluded = val;
      continue;
    }

    // ── Data rows: B = category, C = meal type ────────────────────────────────
    if (colB && colC && !colB.includes("食事カテゴリー")) {
      const totalAmount = toNum(g(6));
      // Skip rows with no meaningful data
      if (!totalAmount && !toNum(g(5))) continue;
      mealRows.push({
        category: colB,
        mealType: colC,
        unitPriceBasic: toNum(g(3)),
        unitPriceHalal: toNum(g(4)),
        totalMeals: toNum(g(5)),
        totalAmount,
      });
    }
  }

  if (mealRows.length === 0 && totalTaxExcluded === null && totalTaxIncluded === null) return null;

  return { rows: mealRows, totalTaxExcluded, totalTaxIncluded };
}

// ── Parse a single 別紙2 sheet ────────────────────────────────────────────────

export function parseMealCostSheet(
  rows: unknown[][],
  sheetName: string
): { facilityNo: string; entry: MealCostEntry } | { error: string } {
  // Extract facility number from sheet name like "0001_ホテル名　別紙2"
  const match = sheetName.match(/^0*(\d+)[_　\s]/);
  if (!match) return { error: `"${sheetName}": 施設番号を抽出できません` };
  const facilityNo = match[1];

  // Hotel name: row 1 (index 0), col D (index 3)
  const row0 = rows[0] ?? [];
  const hotelName = cellStr(row0[3]) || cellStr(row0[0]) || "";

  const { asiaStart, paraStart } = findSectionStarts(rows);

  if (asiaStart < 0 && paraStart < 0) {
    return { error: `"${sheetName}": セクションが見つかりません` };
  }

  const asiaEnd = paraStart >= 0 ? paraStart : rows.length;
  const asia = asiaStart >= 0 ? parseSection(rows, asiaStart + 1, asiaEnd) : null;
  const para = paraStart >= 0 ? parseSection(rows, paraStart + 1, rows.length) : null;

  if (!asia && !para) return { error: `"${sheetName}": データが見つかりません` };

  return { facilityNo, entry: { hotelName, asia, para } };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function parseMealCostsFromFile(
  file: File
): Promise<{ db: MealCostsDB; count: number; errors: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const db: MealCostsDB = {};
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!sheetName.includes("別紙2")) continue;

    try {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: null,
      }) as unknown[][];

      const result = parseMealCostSheet(rows, sheetName);
      if ("error" in result) {
        errors.push(result.error);
      } else {
        db[result.facilityNo] = result.entry;
      }
    } catch (e) {
      errors.push(`"${sheetName}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { db, count: Object.keys(db).length, errors };
}

/**
 * Parse a per-hotel file that contains a single 別紙2 sheet.
 * Returns the entry and facilityNo, or an error.
 */
export async function parseMealCostsFromPerHotelFile(
  file: File
): Promise<{ facilityNo: string; entry: MealCostEntry } | { error: string }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  // Find 別紙2 sheet
  const sheetName = workbook.SheetNames.find((n) => n.includes("別紙2"));
  if (!sheetName) return { error: "別紙2シートが見つかりません" };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  }) as unknown[][];

  return parseMealCostSheet(rows, sheetName);
}
