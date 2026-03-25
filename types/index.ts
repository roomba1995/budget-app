export const GROUPS = [
  "アジア選手団",
  "パラ選手団",
  "アジアファミリー",
  "パラファミリー",
  "アジア技術役員",
  "パラ技術役員",
  "アジアスポンサー",
  "パラスポンサー",
  "アジアメディア",
  "パラメディア",
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
  アジア選手団: "bg-blue-100 text-blue-800 border border-blue-200",
  パラ選手団: "bg-sky-100 text-sky-800 border border-sky-200",
  アジアファミリー: "bg-pink-100 text-pink-800 border border-pink-200",
  パラファミリー: "bg-rose-100 text-rose-800 border border-rose-200",
  アジア技術役員: "bg-purple-100 text-purple-800 border border-purple-200",
  パラ技術役員: "bg-violet-100 text-violet-800 border border-violet-200",
  アジアスポンサー: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  パラスポンサー: "bg-amber-100 text-amber-800 border border-amber-200",
  アジアメディア: "bg-orange-100 text-orange-800 border border-orange-200",
  パラメディア: "bg-red-100 text-red-800 border border-red-200",
  WF: "bg-green-100 text-green-800 border border-green-200",
};

export const GROUP_BG: Record<Group, string> = {
  アジア選手団: "bg-blue-500",
  パラ選手団: "bg-sky-500",
  アジアファミリー: "bg-pink-500",
  パラファミリー: "bg-rose-500",
  アジア技術役員: "bg-purple-500",
  パラ技術役員: "bg-violet-500",
  アジアスポンサー: "bg-yellow-500",
  パラスポンサー: "bg-amber-500",
  アジアメディア: "bg-orange-500",
  パラメディア: "bg-red-500",
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
  /** 保有客室数 */
  totalRooms?: number;
  /** 収容可能人数（保有） */
  totalCapacity?: number;
  /** 提供客室数 */
  offeredRooms?: number;
  /** 収容可能人数（提供） */
  offeredCapacity?: number;
  /** ファンクションルーム 保有室数 */
  totalFunctionRooms?: number;
  /** ファンクションルーム 提供室数 */
  offeredFunctionRooms?: number;
  /** ファンクション利用想定数 */
  functionRoomEstimate?: number;
  /** エリア（名古屋・尾張・知多・西三河・東三河・県外） */
  area?: string;
  /** 市町村郡 */
  municipality?: string;
  /** ジム */
  hasGym?: boolean;
  /** サウナ */
  hasSauna?: boolean;
  /** コインランドリー */
  hasLaundry?: boolean;
  /** 乗降場 */
  boardingArea?: string;
  /** 貸切想定 */
  exclusiveUse?: string;
  /** 食事提供難易度 */
  mealDifficulty?: string;
  /** 食事提供主体想定 */
  mealProvider?: string;
  /** 朝食会場座席数 */
  breakfastSeats?: number;
  /** 配宿競技 */
  assignedSport?: string;
  /** 配宿競技 会場 */
  assignedVenue?: string;
  /** 人数 */
  assignedPersonCount?: number;
  /** 施設別人数 */
  facilityPersonCount?: number;
  /** 利用想定客室数 */
  utilizedRooms?: number;
  /** 平均宿泊人数 */
  avgOccupancy?: number;
  /** 一人あたり平均単価（税込） */
  avgPricePerPerson?: number;
  /** 1室あたり単価（税込） */
  pricePerRoom?: number;
  /** 客室単価幅 最低（税抜） */
  minRoomPrice?: number;
  /** 客室単価幅 最高（税抜） */
  maxRoomPrice?: number;
  /** 変動有無 */
  priceFluctuation?: string;
  /** 見積もり取得状況 */
  estimateStatus?: string;
  /** 朝食単価 */
  breakfastUnitPrice?: number;
  /** 受領見積単価（通常） */
  normalRoomUnitPrice?: number;
  /** 受領見積単価（ハラルヴィーガン） */
  halalRoomUnitPrice?: number;
  /** ハラル支援 */
  halalSupport?: string;
  /** 入湯税/宿泊税 */
  bathTax?: number;
  /** テナントの数（ショップ含む） */
  tenantCount?: number;
  /** キャンセルポリシー概要 */
  cancellationPolicy?: string;
}

export interface HotelSnapshot {
  id: string;
  name: string;
  createdAt: string;
  hotels: Hotel[];
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
