/**
 * 別紙1-1形式のシートをHotel形式に変換するパーサー
 */
import { Hotel, CostItem } from "@/types";

export interface ContractRow {
  // ホテル情報（ヘッダー行から取得）
  hotelName?: string;
  
  // データ行の各列（0-indexed）
  [key: number]: any;
}

function getCell(row: any[] = [], index: number): any {
  if (!row || index < 0 || index >= row.length) return "";
  return row[index];
}

function toNumber(value: any): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const n = Number(String(value).replace(/[^0-9\.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function findHeaderIndex(header: string[], candidates: string[]): number {
  const normalized = header.map((h) => String(h || "").replace(/[\s\u3000]/g, "").toLowerCase());
  for (const candidate of candidates) {
    const target = candidate.replace(/[\s\u3000]/g, "").toLowerCase();
    const idx = normalized.findIndex((h) => h.includes(target));
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * 別紙1-1形式: 各行は複数宿泊パターンを含む部屋タイプ
 * 計算ロジック:
 *   総金額 = (L列素泊まり料 × D列泊数) + (M列通常料 × F列泊数) + (O列素泊まり料 × H列泊数)
 */
export function parseContractSheet1_1(rows: any[][]): Hotel[] {
  if (!rows || rows.length < 2) return [];

  // ヘッダー行（行0）から施設名を取得
  const headerRow = rows[0];
  const hotelName = headerRow[0] ? String(headerRow[0]).trim() : "ホテル";

  // データ行（行1以降）を処理
  const hotels: Hotel[] = [];
  let currentHotel: Hotel | null = null;

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (!row || !row[0]) continue; // 空行はスキップ

    // 黄色でハイライトされた空行（No.が数字でない）をスキップ
    const noCell = row[0];
    if (isNaN(Number(noCell))) continue;

    // ホテルデータの初期化（最初の行のみ）
    if (!currentHotel) {
      currentHotel = {
        id: `${hotelName}-${Date.now()}`,
        name: hotelName,
        location: "",
        groups: [],
        contractStartDate: "",
        contractEndDate: "",
        roomTypes: [],
        costItems: [],
        notes: "",
      };
    }

    // 列番号の定義（スクリーンショットから確認）
    // D列: 素泊まり料 泊数1
    // F列: 通常料金 泊数
    // H列: 素泊まり料 泊数2
    // L列: 素泊まり料1（単価）
    // M列: 通常料金（単価）
    // O列: 素泊まり料2（単価）
    // 右側の合計金額

    const col_d = getCell(row, 3); // D列 (0-indexed: 3)
    const col_f = getCell(row, 5); // F列 (0-indexed: 5)
    const col_h = getCell(row, 7); // H列 (0-indexed: 7)
    const col_l = getCell(row, 11); // L列 (0-indexed: 11)
    const col_m = getCell(row, 12); // M列 (0-indexed: 12)
    const col_o = getCell(row, 14); // O列 (0-indexed: 14)

    // 金額計算
    const nights1 = toNumber(col_d);
    const nights2 = toNumber(col_f);
    const nights3 = toNumber(col_h);
    const price1 = toNumber(col_l);
    const price2 = toNumber(col_m);
    const price3 = toNumber(col_o);

    const budgetAmount =
      nights1 * price1 + nights2 * price2 + nights3 * price3;

    // CostItem を追加
    if (budgetAmount > 0) {
      const costItem: CostItem = {
        id: `cost-${rowIdx}`,
        category: "客室確保費",
        description: `部屋タイプ${rowIdx}`,
        event: "asia",
        unitPrice: price2 > 0 ? price2 : price1 > 0 ? price1 : price3,
        personCount: 1,
        nights: nights1 + nights2 + nights3,
        budgetAmount,
        actualAmount: budgetAmount,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: `素泊${nights1}泊@${price1}, 通常${nights2}泊@${price2}, 素泊${nights3}泊@${price3}`,
      };
      currentHotel.costItems.push(costItem);
    }
  }

  // ホテルをリストに追加
  if (currentHotel && currentHotel.costItems.length > 0) {
    hotels.push(currentHotel);
  }

  return hotels;
}

/**
 * 別紙1-2形式のシートをHotel形式に変換するパーサー
 * 別紙1-1とは異なるフォーマットに対応
 */
export function parseContractSheet1_2(rows: any[][]): Hotel[] {
  if (!rows || rows.length < 2) return [];

  // ヘッダー行（行0）から施設名を取得
  const headerRow = rows[0];
  const hotelName = headerRow[0] ? String(headerRow[0]).trim() : "ホテル";

  // データ行（行1以降）を処理
  const hotels: Hotel[] = [];
  let currentHotel: Hotel | null = null;

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (!row || !row[0]) continue; // 空行はスキップ

    // 黄色でハイライトされた空行（No.が数字でない）をスキップ
    const noCell = row[0];
    if (isNaN(Number(noCell))) continue;

    // ホテルデータの初期化（最初の行のみ）
    if (!currentHotel) {
      currentHotel = {
        id: `${hotelName}-${Date.now()}`,
        name: hotelName,
        location: "",
        groups: [],
        contractStartDate: "",
        contractEndDate: "",
        roomTypes: [],
        costItems: [],
        notes: "",
      };
    }

    // 別紙1-2の列構成に基づいて実装
    // 分析したヘッダー構造に基づく
    const checkInDate = getCell(row, 1); // チェックイン日
    const checkOutDate = getCell(row, 5); // チェックアウト日
    const nights = toNumber(getCell(row, 6)); // 泊数
    const roomType = String(getCell(row, 7) || ""); // 室タイプ
    const personCount = toNumber(getCell(row, 8)); // 人数
    const unitPrice = toNumber(getCell(row, 10)); // 宿泊施設の学級分/キー（単価）
    const breakfast = getCell(row, 11); // 朝食
    const dinner = getCell(row, 12); // 夕食
    const roomService = toNumber(getCell(row, 13)); // ルームサービス
    const business = toNumber(getCell(row, 14)); // 広業
    const newEntryFee = toNumber(getCell(row, 15)); // 新規入室費
    const notes = String(getCell(row, 17) || ""); // 備考

    // 金額計算: 単価 × 泊数 × 人数 + 各種追加料金
    const baseAmount = unitPrice * nights * personCount;
    const additionalAmount = roomService + business + newEntryFee;
    const budgetAmount = baseAmount + additionalAmount;

    // CostItem を追加
    if (budgetAmount > 0) {
      const costItem: CostItem = {
        id: `cost-${rowIdx}`,
        category: "客室確保費",
        description: `${roomType} (${personCount}名)`,
        event: "asia",
        unitPrice,
        personCount,
        nights,
        budgetAmount,
        actualAmount: budgetAmount,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: `別紙1-2形式: ${checkInDate}～${checkOutDate}, 朝食:${breakfast}, 夕食:${dinner}, 備考:${notes}`,
      };
      currentHotel.costItems.push(costItem);
    }
  }

  // ホテルをリストに追加
  if (currentHotel && currentHotel.costItems.length > 0) {
    hotels.push(currentHotel);
  }

  return hotels;
}

/**
 * 指定された積算シート（アジア/パラ/ファミリー/技術役員）をHotelデータに変換
 */
export function parseAccumulationSheet(rows: any[][], sheetName: string): Hotel[] {
  if (!rows || rows.length === 0) return [];

  const headerRowIdx = rows.findIndex((row) =>
    Array.isArray(row)
      ? row.some((cell) =>
          typeof cell === "string"
            ? /(施設名|宿泊施設|施設No\.|客室総計|一日あたり客室総額|宿泊費の合計)/.test(cell)
            : false
        )
      : false
  );

  if (headerRowIdx < 0) return [];

  const header = (rows[headerRowIdx] || []).map((c) => String(c || "").trim());

  const idxName = findHeaderIndex(header, ["施設名", "宿泊施設"]);
  const idxFacilityNo = findHeaderIndex(header, ["施設No"]);
  const idxLocation = findHeaderIndex(header, ["所在地", "市町村郡", "エリア"]);
  const idxRoomTotal = findHeaderIndex(header, ["客室総計", "客室総額", "一日あたり客室総額", "宿泊費の合計"]);
  const idxFunctionTotal = findHeaderIndex(header, ["ﾌｧﾝｸｼｮﾝ総計", "ファンクション総計", "一日あたりﾌｧﾝｸｼｮﾝ総額"]);
  const idxMeal = findHeaderIndex(header, ["食費", "朝食", "夕食"]);
  const idxBusiness = findHeaderIndex(header, ["営業補償", "営業補償等"]);
  const idxOther = findHeaderIndex(header, ["その他"]);
  const idxStart = findHeaderIndex(header, ["開始日"]);
  const idxEnd = findHeaderIndex(header, ["終了日"]);
  const idxNights = findHeaderIndex(header, ["確保泊数", "泊数"]);

  const hotelsMap = new Map<string, Hotel>();
  const event: "asia" | "para" = sheetName.includes("パラ") ? "para" : "asia";

  for (let rowIdx = headerRowIdx + 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (!Array.isArray(row)) continue;

    const nameCell = getCell(row, idxName >= 0 ? idxName : idxFacilityNo);
    const name = String(nameCell || "").trim();
    if (!name) continue;

    const facilityNo = String(getCell(row, idxFacilityNo) || "").trim();
    const key = facilityNo || name;

    const location = String(getCell(row, idxLocation) || "").trim();
    const startDate = getCell(row, idxStart) instanceof Date
      ? (getCell(row, idxStart) as Date).toISOString().slice(0, 10)
      : String(getCell(row, idxStart) || "").trim();
    const endDate = getCell(row, idxEnd) instanceof Date
      ? (getCell(row, idxEnd) as Date).toISOString().slice(0, 10)
      : String(getCell(row, idxEnd) || "").trim();
    const nights = toNumber(getCell(row, idxNights));

    const roomAmount = toNumber(getCell(row, idxRoomTotal));
    const functionAmount = toNumber(getCell(row, idxFunctionTotal));
    const mealAmount = toNumber(getCell(row, idxMeal));
    const businessAmount = toNumber(getCell(row, idxBusiness));
    const otherAmount = toNumber(getCell(row, idxOther));

    if (!hotelsMap.has(key)) {
      hotelsMap.set(key, {
        id: `${sheetName}-${facilityNo || name}-${rowIdx}`,
        facilityNo: facilityNo || undefined,
        name: name || `施設 ${rowIdx}`,
        location,
        groups: [event === "asia" ? "選手団" : "技術役員"],
        contractStartDate: startDate || "",
        contractEndDate: endDate || "",
        roomTypes: [],
        costItems: [],
        notes: `自動抽出:${sheetName}`,
      });
    }

    const hotel = hotelsMap.get(key);
    if (!hotel) continue;

    const addCost = (value: number, category: string) => {
      if (value <= 0) return;
      const item: CostItem = {
        id: `acc-${sheetName}-${rowIdx}-${category}`,
        category: category as any,
        description: `${category} (${sheetName})`,
        event,
        unitPrice: nights > 0 ? Number((value / nights).toFixed(0)) : 0,
        personCount: 0,
        nights: nights || 1,
        budgetAmount: value,
        actualAmount: value,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: `抽出行:${rowIdx}`,
      };
      hotel.costItems.push(item);
    };

    addCost(roomAmount, "客室確保費");
    addCost(functionAmount, "会議室等確保費");
    addCost(mealAmount, "飲食費");
    addCost(businessAmount, "営業補償費");
    addCost(otherAmount, "その他");
  }

  return Array.from(hotelsMap.values());
}
