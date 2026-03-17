export const GROUPS = [
  "選手団",
  "技術役員",
  "ファミリー",
  "スポンサー",
  "メディア",
  "WF",
] as const;
export type Group = (typeof GROUPS)[number];

export const EVENTS = ["asia", "para"] as const;
export type GameEvent = (typeof EVENTS)[number];
export const EVENT_LABELS: Record<GameEvent, string> = {
  asia: "アジア大会",
  para: "パラ大会",
};
export const EVENT_COLORS: Record<GameEvent, string> = {
  asia: "bg-orange-100 text-orange-700 border border-orange-200",
  para: "bg-sky-100 text-sky-700 border border-sky-200",
};

export const COST_CATEGORIES = [
  "客室確保費",
  "飲食費",
  "会議室等確保費",
  "営業補償費",
  "ランドリーサービス費",
  "その他",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export const MEAL_SUB_CATEGORIES = [
  "通常食",
  "ハラル・ヴィーガン",
  "グラブアンドゴー",
  "空港島・仮設厨房",
  "厨房機器レンタル",
] as const;
export type MealSubCategory = (typeof MEAL_SUB_CATEGORIES)[number];

export const CONTRACT_STATUSES = [
  "契約済",
  "契約書提示中",
  "契約書提示前",
  "見積取得済",
  "見積依頼中",
  "見積依頼前",
  "交渉中",
  "未着手",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  契約済: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  契約書提示中: "bg-blue-100 text-blue-700 border border-blue-200",
  契約書提示前: "bg-sky-100 text-sky-700 border border-sky-200",
  見積取得済: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  見積依頼中: "bg-orange-100 text-orange-700 border border-orange-200",
  見積依頼前: "bg-gray-100 text-gray-600 border border-gray-200",
  交渉中: "bg-purple-100 text-purple-700 border border-purple-200",
  未着手: "bg-red-100 text-red-600 border border-red-200",
};

export const GROUP_COLORS: Record<Group, string> = {
  選手団: "bg-blue-100 text-blue-800 border border-blue-200",
  技術役員: "bg-purple-100 text-purple-800 border border-purple-200",
  ファミリー: "bg-pink-100 text-pink-800 border border-pink-200",
  スポンサー: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  メディア: "bg-orange-100 text-orange-800 border border-orange-200",
  WF: "bg-green-100 text-green-800 border border-green-200",
};

export const GROUP_BG: Record<Group, string> = {
  選手団: "bg-blue-500",
  技術役員: "bg-purple-500",
  ファミリー: "bg-pink-500",
  スポンサー: "bg-yellow-500",
  メディア: "bg-orange-500",
  WF: "bg-green-500",
};

export const CATEGORY_COLORS: Record<CostCategory, string> = {
  客室確保費: "bg-blue-50 text-blue-700 border border-blue-200",
  飲食費: "bg-green-50 text-green-700 border border-green-200",
  会議室等確保費: "bg-purple-50 text-purple-700 border border-purple-200",
  営業補償費: "bg-red-50 text-red-700 border border-red-200",
  ランドリーサービス費: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  その他: "bg-gray-50 text-gray-600 border border-gray-200",
};

export interface RoomType {
  id: string;
  typeName: string;
  contractQuantity: number;
}

export interface CostItem {
  id: string;
  category: CostCategory;
  description: string;
  /** アジア大会 or パラ大会 */
  event: GameEvent;
  /** 単価（0 = 一括金額入力） */
  unitPrice: number;
  /** 人数 */
  personCount: number;
  /** 泊数 */
  nights: number;
  budgetAmount: number;
  actualAmount: number;
  /** 執行済み額 */
  executedAmount: number;
  /** 執行予定額 */
  plannedAmount: number;
  /** 今後の執行見込み */
  forecastAmount: number;
  /** 飲食費のサブカテゴリ */
  mealSubCategory?: MealSubCategory;
  notes: string;
}

export interface Hotel {
  id: string;
  /** 施設番号 e.g. "0001" */
  facilityNo?: string;
  name: string;
  location: string;
  groups: Group[];
  contractStatus?: ContractStatus;
  contractStartDate: string;
  contractEndDate: string;
  roomTypes: RoomType[];
  costItems: CostItem[];
  notes: string;
}

export interface BudgetVersionEntry {
  hotelId: string;
  hotelName: string;
  category: CostCategory;
  event: GameEvent;
  budgetAmount: number;
  actualAmount: number;
}

export interface BudgetVersion {
  id: string;
  name: string;
  createdAt: string;
  entries: BudgetVersionEntry[];
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function calcVariance(budget: number, actual: number) {
  const diff = actual - budget;
  if (diff === 0)
    return { diff: 0, text: "±¥0", className: "text-gray-400" };
  if (diff > 0)
    return {
      diff,
      text: `▲${formatCurrency(diff)}`,
      className: "text-red-600 font-semibold",
    };
  return {
    diff,
    text: `△${formatCurrency(Math.abs(diff))}`,
    className: "text-emerald-600 font-semibold",
  };
}

export function calcHotelTotals(hotel: Hotel) {
  const budget = hotel.costItems.reduce((s, i) => s + i.budgetAmount, 0);
  const actual = hotel.costItems.reduce((s, i) => s + i.actualAmount, 0);
  return { budget, actual };
}

export function formatDateRange(start: string, end: string): string {
  if (!start && !end) return "未設定";
  const fmt = (d: string) => {
    if (!d) return "?";
    const [y, m, day] = d.split("-");
    return `${y}/${m}/${day}`;
  };
  return `${fmt(start)} 〜 ${fmt(end)}`;
}

/** 単価×人数×泊数から実績額を計算（全て>0の場合のみ） */
export function calcLineTotal(
  unitPrice: number,
  personCount: number,
  nights: number
): number | null {
  if (unitPrice > 0 && personCount > 0 && nights > 0) {
    return unitPrice * personCount * nights;
  }
  return null;
}
