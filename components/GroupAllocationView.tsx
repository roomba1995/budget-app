"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Hotel, Group, GROUPS, GROUP_COLORS, formatCurrency } from "@/types";

interface Props {
  hotels: Hotel[];
}

// ─────────────────────────────────────────────
// 列定義
// ─────────────────────────────────────────────
interface ColDef {
  id: string;
  label: string;       // ヘッダー表示（改行は \n）
  defaultVisible: boolean;
  group: string;       // 列設定パネルのグループ
  render: (h: Hotel, extra: Extra) => React.ReactNode;
  align?: "left" | "right" | "center";
}

interface Extra {
  nights: number;
  roomBudget: number;
  roomActual: number;
  funcBudget: number;
}

function numOrDash(v: number | undefined | null): string {
  return v != null ? v.toLocaleString() : "—";
}
function yenOrDash(v: number | undefined | null): string {
  return v != null && v > 0 ? formatCurrency(v) : "—";
}
function boolCell(v: boolean | undefined): string {
  return v ? "○" : "—";
}

const COL_DEFS: ColDef[] = [
  // ── 基本情報 ──────────────────────────────
  { id: "area",       label: "エリア",         defaultVisible: true,  group: "基本情報", align: "left",
    render: (h) => h.area ?? "—" },
  { id: "municipality", label: "市町村郡",      defaultVisible: false, group: "基本情報", align: "left",
    render: (h) => h.municipality ?? "—" },
  { id: "facilityNo", label: "施設\n番号",      defaultVisible: true,  group: "基本情報", align: "center",
    render: (h) => h.facilityNo ? <span className="font-mono text-blue-600">{h.facilityNo}</span> : "—" },
  { id: "location",   label: "所在地",         defaultVisible: false, group: "基本情報", align: "left",
    render: (h) => h.location || "—" },
  // ── 客室数 ────────────────────────────────
  { id: "totalRooms", label: "保有\n客室数",    defaultVisible: true,  group: "客室数", align: "right",
    render: (h) => numOrDash(h.totalRooms) + (h.totalRooms != null ? " 室" : "") },
  { id: "totalCapacity", label: "収容\n人数(保有)", defaultVisible: false, group: "客室数", align: "right",
    render: (h) => numOrDash(h.totalCapacity) + (h.totalCapacity != null ? " 名" : "") },
  { id: "offeredRooms", label: "提供\n客室数",   defaultVisible: true,  group: "客室数", align: "right",
    render: (h) => <span className="font-semibold text-blue-600">{numOrDash(h.offeredRooms)}{h.offeredRooms != null ? " 室" : ""}</span> },
  { id: "offeredCapacity", label: "収容\n人数(提供)", defaultVisible: false, group: "客室数", align: "right",
    render: (h) => numOrDash(h.offeredCapacity) + (h.offeredCapacity != null ? " 名" : "") },
  { id: "utilizedRooms", label: "利用想定\n客室数", defaultVisible: false, group: "客室数", align: "right",
    render: (h) => numOrDash(h.utilizedRooms) + (h.utilizedRooms != null ? " 室" : "") },
  { id: "avgOccupancy", label: "平均\n宿泊人数", defaultVisible: false, group: "客室数", align: "right",
    render: (h) => numOrDash(h.avgOccupancy) + (h.avgOccupancy != null ? " 名" : "") },
  // ── ファンクション ─────────────────────────
  { id: "totalFunctionRooms", label: "ファンクション\n保有", defaultVisible: true,  group: "ファンクション", align: "right",
    render: (h) => numOrDash(h.totalFunctionRooms) + (h.totalFunctionRooms != null ? " 室" : "") },
  { id: "offeredFunctionRooms", label: "ファンクション\n提供", defaultVisible: true,  group: "ファンクション", align: "right",
    render: (h) => numOrDash(h.offeredFunctionRooms) + (h.offeredFunctionRooms != null ? " 室" : "") },
  { id: "functionRoomEstimate", label: "ファンクション\n利用想定", defaultVisible: false, group: "ファンクション", align: "right",
    render: (h) => numOrDash(h.functionRoomEstimate) + (h.functionRoomEstimate != null ? " 室" : "") },
  // ── 設備 ──────────────────────────────────
  { id: "hasGym",     label: "ジム",           defaultVisible: false, group: "設備", align: "center",
    render: (h) => boolCell(h.hasGym) },
  { id: "hasSauna",   label: "サウナ",         defaultVisible: false, group: "設備", align: "center",
    render: (h) => boolCell(h.hasSauna) },
  { id: "hasLaundry", label: "コイン\nランドリー", defaultVisible: false, group: "設備", align: "center",
    render: (h) => boolCell(h.hasLaundry) },
  { id: "boardingArea", label: "乗降場",       defaultVisible: false, group: "設備", align: "left",
    render: (h) => h.boardingArea ?? "—" },
  { id: "exclusiveUse", label: "貸切想定",     defaultVisible: false, group: "設備", align: "center",
    render: (h) => h.exclusiveUse ?? "—" },
  { id: "tenantCount",  label: "テナント数",   defaultVisible: false, group: "設備", align: "right",
    render: (h) => numOrDash(h.tenantCount) },
  // ── 食事 ──────────────────────────────────
  { id: "mealDifficulty", label: "食事提供\n難易度", defaultVisible: false, group: "食事", align: "center",
    render: (h) => h.mealDifficulty ?? "—" },
  { id: "mealProvider",   label: "食事提供\n主体", defaultVisible: false, group: "食事", align: "left",
    render: (h) => h.mealProvider ?? "—" },
  { id: "breakfastSeats", label: "朝食会場\n座席数", defaultVisible: false, group: "食事", align: "right",
    render: (h) => numOrDash(h.breakfastSeats) + (h.breakfastSeats != null ? " 席" : "") },
  { id: "breakfastUnitPrice", label: "朝食単価",  defaultVisible: false, group: "食事", align: "right",
    render: (h) => yenOrDash(h.breakfastUnitPrice) },
  { id: "halalSupport",   label: "ハラル\n支援", defaultVisible: false, group: "食事", align: "center",
    render: (h) => h.halalSupport ?? "—" },
  // ── 配宿情報 ──────────────────────────────
  { id: "assignedSport",  label: "配宿競技",    defaultVisible: true,  group: "配宿情報", align: "left",
    render: (h) => h.assignedSport ?? "—" },
  { id: "assignedVenue",  label: "会場",        defaultVisible: true,  group: "配宿情報", align: "left",
    render: (h) => h.assignedVenue ?? "—" },
  { id: "assignedPersonCount", label: "人数",   defaultVisible: true,  group: "配宿情報", align: "right",
    render: (h) => numOrDash(h.assignedPersonCount) + (h.assignedPersonCount != null ? " 名" : "") },
  { id: "facilityPersonCount", label: "施設別\n人数", defaultVisible: false, group: "配宿情報", align: "right",
    render: (h) => numOrDash(h.facilityPersonCount) + (h.facilityPersonCount != null ? " 名" : "") },
  // ── 料金 ──────────────────────────────────
  { id: "estimateStatus",    label: "見積取得\n状況",    defaultVisible: true,  group: "料金", align: "center",
    render: (h) => h.estimateStatus ?? "—" },
  { id: "normalRoomUnitPrice", label: "見積単価\n（通常）",  defaultVisible: true,  group: "料金", align: "right",
    render: (h) => yenOrDash(h.normalRoomUnitPrice) },
  { id: "halalRoomUnitPrice",  label: "見積単価\n（ハラル）", defaultVisible: false, group: "料金", align: "right",
    render: (h) => yenOrDash(h.halalRoomUnitPrice) },
  { id: "pricePerRoom",        label: "1室単価\n（税込）", defaultVisible: false, group: "料金", align: "right",
    render: (h) => yenOrDash(h.pricePerRoom) },
  { id: "minRoomPrice",        label: "単価幅最低\n（税抜）", defaultVisible: false, group: "料金", align: "right",
    render: (h) => yenOrDash(h.minRoomPrice) },
  { id: "maxRoomPrice",        label: "単価幅最高\n（税抜）", defaultVisible: false, group: "料金", align: "right",
    render: (h) => yenOrDash(h.maxRoomPrice) },
  { id: "priceFluctuation",    label: "変動\n有無",        defaultVisible: false, group: "料金", align: "center",
    render: (h) => h.priceFluctuation ?? "—" },
  { id: "bathTax",             label: "入湯税\n/宿泊税",   defaultVisible: false, group: "料金", align: "right",
    render: (h) => yenOrDash(h.bathTax) },
  { id: "cancellationPolicy",  label: "キャンセル\nポリシー", defaultVisible: false, group: "料金", align: "left",
    render: (h) => h.cancellationPolicy ?? "—" },
  // ── 日程・集計 ────────────────────────────
  { id: "ci",     label: "CI",       defaultVisible: true,  group: "日程・集計", align: "center",
    render: (h) => h.contractStartDate ? fmtDate(h.contractStartDate) : "—" },
  { id: "co",     label: "CO",       defaultVisible: true,  group: "日程・集計", align: "center",
    render: (h) => h.contractEndDate ? fmtDate(h.contractEndDate) : "—" },
  { id: "nights", label: "確保\n泊数", defaultVisible: true, group: "日程・集計", align: "right",
    render: (_h, ex) => ex.nights > 0 ? `${ex.nights} 泊` : "—" },
  { id: "dailyRoomBudget", label: "1日あたり\n客室費（予算）", defaultVisible: true, group: "日程・集計", align: "right",
    render: (_h, ex) => ex.nights > 0 && ex.roomBudget > 0 ? formatCurrency(Math.round(ex.roomBudget / ex.nights)) : "—" },
  { id: "roomBudgetTotal", label: "客室総計\n（予算）",  defaultVisible: true,  group: "日程・集計", align: "right",
    render: (_h, ex) => yenOrDash(ex.roomBudget) },
  { id: "roomActualTotal", label: "客室総計\n（実績）",  defaultVisible: false, group: "日程・集計", align: "right",
    render: (_h, ex) => yenOrDash(ex.roomActual) },
  { id: "funcBudgetTotal", label: "ファンクション\n総計（予算）", defaultVisible: false, group: "日程・集計", align: "right",
    render: (_h, ex) => yenOrDash(ex.funcBudget) },
];

function fmtDate(d: string): string {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

const STORAGE_KEY = "groupAllocation-hiddenCols-v1";
export const COL_CONFIG_KEY = "groupAllocation-col-defs-v1";

export interface ColConfig {
  id: string;
  label: string;
  order: number;
  group?: string;
}

function loadHidden(): Set<string> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? new Set(JSON.parse(s)) : new Set(COL_DEFS.filter((c) => !c.defaultVisible).map((c) => c.id));
  } catch {
    return new Set(COL_DEFS.filter((c) => !c.defaultVisible).map((c) => c.id));
  }
}

/** Map all known label variations (current + historical) → COL_DEF id.
 *  Required because DEFAULT_COL_LABELS has changed over time, and users may
 *  have CSV files downloaded with older label names. */
export const LABEL_TO_ID: Record<string, string> = {
  // 基本情報
  "エリア": "area",
  "市町村郡": "municipality",
  "施設番号": "facilityNo",
  "施設\n番号": "facilityNo",
  "所在地": "location",
  // 客室数
  "保有客室数": "totalRooms",
  "保有\n客室数": "totalRooms",
  "収容人数(保有)": "totalCapacity",
  "収容\n人数(保有)": "totalCapacity",
  "提供客室数": "offeredRooms",
  "提供\n客室数": "offeredRooms",
  "収容人数(提供)": "offeredCapacity",
  "収容\n人数(提供)": "offeredCapacity",
  "利用想定客室数": "utilizedRooms",
  "利用想定\n客室数": "utilizedRooms",
  "平均宿泊人数": "avgOccupancy",
  "平均\n宿泊人数": "avgOccupancy",
  // ファンクション
  "ファンクション保有": "totalFunctionRooms",
  "ファンクション\n保有": "totalFunctionRooms",
  "ファンクション保有室数": "totalFunctionRooms",  // old
  "ファンクション提供": "offeredFunctionRooms",
  "ファンクション\n提供": "offeredFunctionRooms",
  "ファンクション提供室数": "offeredFunctionRooms",  // old
  "ファンクション利用想定": "functionRoomEstimate",
  "ファンクション\n利用想定": "functionRoomEstimate",
  "ファンクション見積額": "functionRoomEstimate",  // old
  // 設備
  "ジム": "hasGym",
  "サウナ": "hasSauna",
  "コインランドリー": "hasLaundry",
  "コイン\nランドリー": "hasLaundry",
  "乗降場": "boardingArea",
  "乗降エリア": "boardingArea",  // old
  "貸切想定": "exclusiveUse",
  "専有利用": "exclusiveUse",  // old
  "テナント数": "tenantCount",
  // 食事
  "食事提供難易度": "mealDifficulty",
  "食事提供\n難易度": "mealDifficulty",
  "食事難易度": "mealDifficulty",  // old
  "食事提供主体": "mealProvider",
  "食事提供\n主体": "mealProvider",
  "食事提供者": "mealProvider",  // old
  "朝食会場座席数": "breakfastSeats",
  "朝食会場\n座席数": "breakfastSeats",
  "朝食席数": "breakfastSeats",  // old
  "朝食単価": "breakfastUnitPrice",
  "ハラル支援": "halalSupport",
  "ハラル\n支援": "halalSupport",
  "ハラール対応": "halalSupport",  // old
  // 配宿情報
  "配宿競技": "assignedSport",
  "会場": "assignedVenue",
  "配宿会場": "assignedVenue",  // old
  "人数": "assignedPersonCount",
  "配宿人数": "assignedPersonCount",  // old
  "施設別人数": "facilityPersonCount",
  "施設別\n人数": "facilityPersonCount",
  "施設内人数": "facilityPersonCount",  // old
  // 料金
  "見積取得状況": "estimateStatus",
  "見積取得\n状況": "estimateStatus",
  "見積状況": "estimateStatus",  // old
  "見積単価（通常）": "normalRoomUnitPrice",
  "見積単価\n（通常）": "normalRoomUnitPrice",
  "通常客室単価": "normalRoomUnitPrice",  // old
  "見積単価（ハラル）": "halalRoomUnitPrice",
  "見積単価\n（ハラル）": "halalRoomUnitPrice",
  "ハラール客室単価": "halalRoomUnitPrice",  // old
  "1室単価（税込）": "pricePerRoom",
  "1室単価\n（税込）": "pricePerRoom",
  "室料単価": "pricePerRoom",  // old
  "単価幅最低（税抜）": "minRoomPrice",
  "単価幅最低\n（税抜）": "minRoomPrice",
  "最低客室単価": "minRoomPrice",  // old
  "単価幅最高（税抜）": "maxRoomPrice",
  "単価幅最高\n（税抜）": "maxRoomPrice",
  "最高客室単価": "maxRoomPrice",  // old
  "変動有無": "priceFluctuation",
  "変動\n有無": "priceFluctuation",
  "料金変動": "priceFluctuation",  // old
  "入湯税/宿泊税": "bathTax",
  "入湯税\n/宿泊税": "bathTax",
  "入湯税": "bathTax",  // old
  "キャンセルポリシー": "cancellationPolicy",
  "キャンセル\nポリシー": "cancellationPolicy",
  // 日程・集計
  "CI": "ci",
  "チェックイン": "ci",  // old
  "CO": "co",
  "チェックアウト": "co",  // old
  "確保泊数": "nights",
  "確保\n泊数": "nights",
  "宿泊夜数": "nights",  // old
  "1日あたり客室費（予算）": "dailyRoomBudget",
  "1日あたり\n客室費（予算）": "dailyRoomBudget",
  "客室総計（予算）": "roomBudgetTotal",
  "客室総計\n（予算）": "roomBudgetTotal",
  "客室確保費(予算)": "roomBudgetTotal",  // old
  "客室総計（実績）": "roomActualTotal",
  "客室総計\n（実績）": "roomActualTotal",
  "客室確保費(実績)": "roomActualTotal",  // old
  "ファンクション総計（予算）": "funcBudgetTotal",
  "ファンクション\n総計（予算）": "funcBudgetTotal",
  "会議室等確保費(予算)": "funcBudgetTotal",  // old
};

/** Normalize a label for robust matching:
 *  - removes CR/LF
 *  - converts full-width parens （）→ half-width ()
 *  - converts full-width space → regular space
 *  - trims whitespace */
function normLabel(l: string): string {
  return l
    .replace(/[\r\n]/g, "")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/\u3000/g, " ")
    .trim();
}

/** Apply label/order overrides from admin config.
 *  Only returns columns present in the config; columns absent from config are excluded.
 *  Matching priority:
 *    1) exact ID match
 *    2) LABEL_TO_ID lookup (with full↔half-width normalization)
 *    3) direct COL_DEF label match (normalized) */
function applyColConfig(defs: ColDef[]): ColDef[] {
  try {
    const s = localStorage.getItem(COL_CONFIG_KEY);
    if (!s) return defs;
    const cfg: ColConfig[] = JSON.parse(s);
    if (!cfg.length) return defs;

    // Build normalized-key version of LABEL_TO_ID (handles full↔half-width parens)
    const normalizedLabelMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(LABEL_TO_ID)) {
      normalizedLabelMap[normLabel(k)] = v;
    }

    // Build direct COL_DEF label lookup (normalized) as last resort
    const colDefByLabel = new Map<string, string>(); // normalized label → col id
    for (const d of defs) {
      const nl = normLabel(d.label);
      if (!colDefByLabel.has(nl)) colDefByLabel.set(nl, d.id);
    }

    // Resolve each config entry → ColDef.id
    const resolved = new Map<string, ColConfig>(); // key = ColDef.id
    for (const c of cfg) {
      const nl = normLabel(c.label);
      // 1) Exact ID match
      if (defs.some((d) => d.id === c.id)) {
        resolved.set(c.id, c); continue;
      }
      // 2) LABEL_TO_ID lookup (normalized — handles full↔half-width parens)
      const targetId = normalizedLabelMap[nl];
      if (targetId && defs.some((d) => d.id === targetId) && !resolved.has(targetId)) {
        resolved.set(targetId, { ...c, id: targetId }); continue;
      }
      // 3) Direct COL_DEF label match (catches anything LABEL_TO_ID doesn't cover)
      const directId = colDefByLabel.get(nl);
      if (directId && !resolved.has(directId)) {
        resolved.set(directId, { ...c, id: directId });
      }
    }

    if (resolved.size === 0) return defs;

    // Return ONLY the columns present in the config, in config order
    return defs
      .filter((d) => resolved.has(d.id))
      .map((d) => {
        const ov = resolved.get(d.id)!;
        return { ...d, label: ov.label, ...(ov.group ? { group: ov.group } : {}) };
      })
      .sort((a, b) => (resolved.get(a.id)!.order ?? 9999) - (resolved.get(b.id)!.order ?? 9999));
  } catch {
    return defs;
  }
}

// ─────────────────────────────────────────────
export default function GroupAllocationView({ hotels }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<Group>(GROUPS[0]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => loadHidden());
  const [colPanelOpen, setColPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  // Sync top ↔ table scroll
  const syncFromTop = () => {
    if (tableWrapRef.current && topScrollRef.current)
      tableWrapRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  };
  const syncFromTable = () => {
    if (topScrollRef.current && tableWrapRef.current)
      topScrollRef.current.scrollLeft = tableWrapRef.current.scrollLeft;
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenCols)));
  }, [hiddenCols]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setColPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleCol = (id: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [activeDefs, setActiveDefs] = useState(() => applyColConfig(COL_DEFS));

  // Re-read col config whenever admin imports new settings
  useEffect(() => {
    const refresh = (resetHidden: boolean) => {
      setActiveDefs(applyColConfig(COL_DEFS));
      if (resetHidden) {
        // New config defines the column set — clear manual hide state so all imported cols are visible
        setHiddenCols(new Set());
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    // cross-tab: storage event fires in THIS tab when ANOTHER tab writes localStorage
    const onStorage = (e: StorageEvent) => { if (e.key === COL_CONFIG_KEY) refresh(true); };
    // same-tab: visibilitychange fires when user switches back from admin tab
    const onVisible = () => { if (document.visibilityState === "visible") refresh(false); };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const visibleCols = activeDefs.filter((c) => !hiddenCols.has(c.id));

  const groupHotels = useMemo(
    () => hotels.filter((h) => h.groups.includes(selectedGroup)),
    [hotels, selectedGroup]
  );

  const { dateRange } = useMemo(() => {
    const starts = groupHotels.map((h) => h.contractStartDate).filter(Boolean).map((d) => new Date(d));
    const ends   = groupHotels.map((h) => h.contractEndDate).filter(Boolean).map((d) => new Date(d));
    if (!starts.length) return { dateRange: [] };
    const min = new Date(Math.min(...starts.map((d) => d.getTime())));
    const max = new Date(Math.max(...ends.map((d) => d.getTime())));
    const dates: Date[] = [];
    for (let d = new Date(min); d <= max; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
    return { dateRange: dates };
  }, [groupHotels]);

  const totals = useMemo(() => groupHotels.reduce(
    (acc, h) => {
      const rc = h.costItems.filter((i) => i.category === "客室確保費");
      const fc = h.costItems.filter((i) => i.category === "会議室等確保費");
      return {
        budget: acc.budget + rc.reduce((s, i) => s + i.budgetAmount, 0),
        actual: acc.actual + rc.reduce((s, i) => s + i.actualAmount, 0),
        offeredRooms: acc.offeredRooms + (h.offeredRooms ?? 0),
      };
    },
    { budget: 0, actual: 0, offeredRooms: 0 }
  ), [groupHotels]);

  const colGroups = useMemo(() => {
    const map = new Map<string, ColDef[]>();
    for (const c of activeDefs) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return map;
  }, [activeDefs]);

  return (
    <div className="space-y-4">
      {/* グループ選択 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium">ステークホルダー選択</div>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button key={g} onClick={() => setSelectedGroup(g)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                g === selectedGroup ? GROUP_COLORS[g] : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">対象ホテル数</div>
          <div className="text-2xl font-bold text-gray-800">{groupHotels.length}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">提供客室数（合計）</div>
          <div className="text-2xl font-bold text-blue-600">
            {totals.offeredRooms > 0 ? totals.offeredRooms.toLocaleString() : "—"}
            <span className="text-sm font-normal text-gray-500 ml-1">室</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">客室確保費（予算）</div>
          <div className="text-lg font-bold text-gray-800">{totals.budget > 0 ? formatCurrency(totals.budget) : "—"}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">客室確保費（実績）</div>
          <div className="text-lg font-bold text-gray-800">{totals.actual > 0 ? formatCurrency(totals.actual) : "—"}</div>
        </div>
      </div>

      {/* ホテル一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            {selectedGroup} — ホテル配宿一覧
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{groupHotels.length}件</span>
            {/* 列設定再適用ボタン */}
            <button
              onClick={() => setActiveDefs(applyColConfig(COL_DEFS))}
              title="管理画面でインポートした列設定を再読み込みします"
              className="text-xs px-2 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
            >
              🔄 設定再適用
            </button>
            {/* 列設定ボタン */}
            <div className="relative" ref={panelRef}>
              <button
                onClick={() => setColPanelOpen((v) => !v)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600"
              >
                ⚙ 列設定
                <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                  {visibleCols.length}/{activeDefs.length}
                </span>
              </button>
              {colPanelOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">表示列の設定</span>
                    <div className="flex gap-2">
                      <button onClick={() => setHiddenCols(new Set())} className="text-xs text-blue-600 hover:underline">全表示</button>
                      <button onClick={() => setHiddenCols(new Set(activeDefs.map((c) => c.id)))} className="text-xs text-gray-400 hover:underline">全非表示</button>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-4">
                    {Array.from(colGroups.entries()).map(([grp, cols]) => (
                      <div key={grp}>
                        <div className="text-xs font-semibold text-gray-500 mb-2">{grp}</div>
                        <div className="space-y-1.5">
                          {cols.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                              <input
                                type="checkbox"
                                checked={!hiddenCols.has(c.id)}
                                onChange={() => toggleCol(c.id)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                              />
                              <span className="text-xs text-gray-700">{c.label.replace("\n", " ")}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {groupHotels.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            「{selectedGroup}」のホテルは登録されていません
          </div>
        ) : (
          <>
          <div ref={topScrollRef} className="overflow-x-auto border-b border-gray-100" onScroll={syncFromTop}>
            <div style={{ height: 1, minWidth: `${visibleCols.length * 90 + 200}px` }} />
          </div>
          <div ref={tableWrapRef} className="overflow-x-auto" onScroll={syncFromTable}>
            <table className="w-full text-sm" style={{ minWidth: `${visibleCols.length * 90 + 200}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                  <th className="text-left py-3 px-4 font-medium sticky left-0 bg-gray-50 z-10 min-w-[180px]">施設名</th>
                  {visibleCols.map((c) => (
                    <th key={c.id} className={`py-3 px-3 font-medium whitespace-pre-line text-${c.align ?? "right"}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupHotels.map((h) => {
                  const rc = h.costItems.filter((i) => i.category === "客室確保費");
                  const fc = h.costItems.filter((i) => i.category === "会議室等確保費");
                  const ex: Extra = {
                    nights: nightsBetween(h.contractStartDate, h.contractEndDate),
                    roomBudget: rc.reduce((s, i) => s + i.budgetAmount, 0),
                    roomActual: rc.reduce((s, i) => s + i.actualAmount, 0),
                    funcBudget: fc.reduce((s, i) => s + i.budgetAmount, 0),
                  };
                  return (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 sticky left-0 bg-white hover:bg-gray-50 z-10">
                        <div className="font-medium text-gray-800 text-sm">{h.name}</div>
                      </td>
                      {visibleCols.map((c) => (
                        <td key={c.id} className={`py-3 px-3 tabular-nums text-xs text-gray-700 whitespace-nowrap text-${c.align ?? "right"}`}>
                          {c.render(h, ex)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200 text-xs">
                  <td className="py-3 px-4 text-gray-700 sticky left-0 bg-gray-50 z-10">合計</td>
                  {visibleCols.map((c) => {
                    let cell: React.ReactNode = null;
                    if (c.id === "offeredRooms") cell = totals.offeredRooms > 0 ? <span className="text-blue-600">{totals.offeredRooms.toLocaleString()} 室</span> : "—";
                    if (c.id === "roomBudgetTotal") cell = yenOrDash(totals.budget);
                    if (c.id === "roomActualTotal") cell = yenOrDash(totals.actual);
                    return (
                      <td key={c.id} className={`py-3 px-3 whitespace-nowrap text-${c.align ?? "right"}`}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        )}
      </div>

      {/* 配宿スケジュール（ガントチャート） */}
      {groupHotels.length > 0 && dateRange.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">配宿スケジュール</h3>
            <p className="text-xs text-gray-400 mt-0.5">チェックイン〜チェックアウト期間</p>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${dateRange.length * 30 + 220}px` }}>
              {/* 月ヘッダー */}
              <div className="flex border-b border-gray-100 bg-gray-50">
                <div className="w-52 flex-shrink-0" />
                {dateRange.reduce<{ month: number; count: number }[]>((acc, d) => {
                  const m = d.getMonth() + 1;
                  if (!acc.length || acc[acc.length - 1].month !== m) acc.push({ month: m, count: 1 });
                  else acc[acc.length - 1].count++;
                  return acc;
                }, []).map((g, i) => (
                  <div key={i} className="flex-shrink-0 text-xs font-semibold text-gray-500 text-center py-1.5 border-l border-gray-200"
                    style={{ width: `${g.count * 30}px` }}>
                    {g.month}月
                  </div>
                ))}
              </div>
              {/* 日付ヘッダー */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <div className="w-52 flex-shrink-0 px-4 py-2 text-xs font-medium text-gray-600">施設名</div>
                {dateRange.map((d, i) => {
                  const dow = d.getDay();
                  return (
                    <div key={i} className={`w-[30px] flex-shrink-0 text-center text-xs py-1.5 border-l border-gray-100 ${dow === 0 ? "text-red-400 bg-red-50" : dow === 6 ? "text-blue-400 bg-blue-50" : "text-gray-500"}`}>
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
              {/* ホテル行 */}
              {groupHotels.map((h) => {
                const ciDate = h.contractStartDate ? new Date(h.contractStartDate) : null;
                const coDate = h.contractEndDate ? new Date(h.contractEndDate) : null;
                return (
                  <div key={h.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <div className="w-52 flex-shrink-0 px-4 py-2">
                      <div className="text-xs font-medium text-gray-700 truncate">{h.name}</div>
                      {h.offeredRooms != null && <div className="text-xs text-blue-500">{h.offeredRooms}室</div>}
                    </div>
                    {dateRange.map((d, i) => {
                      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
                      const inRange = ciDate && coDate && dayStart >= ciDate && dayStart < coDate;
                      const dow = d.getDay();
                      return (
                        <div key={i} className={`w-[30px] h-9 flex-shrink-0 flex items-center justify-center border-l border-gray-100 ${dow === 0 ? "bg-red-50/40" : dow === 6 ? "bg-blue-50/40" : ""}`}>
                          {inRange && <div className="h-5 w-full mx-0.5 rounded-sm bg-blue-400 opacity-80" />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
