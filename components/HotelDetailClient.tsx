"use client";

import { useState, useMemo, Suspense, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useHotels } from "@/hooks/useHotels";
import {
  CostItem,
  CostCategory,
  COST_CATEGORIES,
  CATEGORY_COLORS,
  EVENT_COLORS,
  EVENT_LABELS,
  CONTRACT_STATUS_COLORS,
  GROUP_COLORS,
  calcHotelTotals,
  calcVariance,
  formatCurrency,
  formatDateRange,
} from "@/types";
import CostItemModal from "@/components/CostItemModal";
import HotelFormModal from "@/components/HotelFormModal";

// ─────────────────────────────────────────────
// Room charge types
// ─────────────────────────────────────────────

interface RoomRow {
  no: number;
  roomType: string;
  totalRooms: number | null;
  offeredRooms: number | null;
  preparePrice: number | null;
  mainPrice: number | null;
  dailyAmount: number | null;
  removePrice: number | null;
  roomNights: number | null;
}

interface RoomChargeSection {
  rooms: RoomRow[];
  totalRooms: number | null;
  offeredRooms: number | null;
  roomNights: number | null;
  dailyCost: number | null;
  dailyCostTax: number | null;
  totalCost: number | null;
  totalCostTax: number | null;
}

function hasMeaningfulData(sec: RoomChargeSection): boolean {
  return (sec.rooms?.length ?? 0) > 0 || sec.dailyCost != null || sec.totalCostTax != null;
}

function fmtNum(v: number | null | undefined): string {
  return v == null ? "—" : v.toLocaleString("ja-JP") + "円";
}

function fmtInt(v: number | null | undefined): string {
  return v == null ? "—" : v.toLocaleString("ja-JP");
}

const ROOM_CHARGES_STORAGE_KEY = "room-charges-uploaded";
type RoomChargesDB = Record<string, { hotelName: string; asia: RoomChargeSection; para: RoomChargeSection | null }>;

// ─────────────────────────────────────────────
// Room charge table components (no hooks — safe to use anywhere)
// ─────────────────────────────────────────────

function RoomChargeSectionTable({ label, section }: { label: string; section: RoomChargeSection }) {
  if (!hasMeaningfulData(section)) return null;
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-1 mb-2 inline-block">{label}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px] border border-gray-100 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <th className="text-left py-2 px-3 font-medium">No.</th>
              <th className="text-left py-2 px-3 font-medium">客室タイプ</th>
              <th className="text-right py-2 px-3 font-medium">総客室数</th>
              <th className="text-right py-2 px-3 font-medium">提供客室</th>
              <th className="text-right py-2 px-3 font-medium">本番単価</th>
              <th className="text-right py-2 px-3 font-medium">1日あたり (M×K)</th>
              <th className="text-right py-2 px-3 font-medium">ルームナイツ</th>
            </tr>
          </thead>
          <tbody>
            {(section.rooms ?? []).map((r) => (
              <tr key={r.no} className="border-b border-gray-50 hover:bg-blue-50/20">
                <td className="py-2 px-3 text-gray-400">{r.no}</td>
                <td className="py-2 px-3 text-gray-700 font-medium">{r.roomType}</td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmtInt(r.totalRooms)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmtInt(r.offeredRooms)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-600">{r.mainPrice != null ? r.mainPrice.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold text-gray-800">{fmtInt(r.dailyAmount)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmtInt(r.roomNights)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
              <td colSpan={2} className="py-2 px-3 text-gray-600">合計</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtInt(section.totalRooms)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtInt(section.offeredRooms)}</td>
              <td className="py-2 px-3" />
              <td className="py-2 px-3 text-right tabular-nums text-blue-700">{fmtNum(section.dailyCost)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtInt(section.roomNights)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-center">
          <div className="text-blue-500 mb-0.5">1日あたり客室費</div>
          <div className="font-bold text-blue-800 tabular-nums">{fmtNum(section.dailyCost)}</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-center">
          <div className="text-gray-500 mb-0.5">1日あたり（税込）</div>
          <div className="font-bold text-gray-800 tabular-nums">{fmtNum(section.dailyCostTax)}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 text-center">
          <div className="text-green-600 mb-0.5">客室合計</div>
          <div className="font-bold text-green-800 tabular-nums">{fmtNum(section.totalCost)}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
          <div className="text-emerald-600 mb-0.5">客室合計（税込）</div>
          <div className="font-bold text-emerald-800 tabular-nums">{fmtNum(section.totalCostTax)}</div>
        </div>
      </div>
    </div>
  );
}

function RoomChargeInTab({ chargeData }: { chargeData: RoomChargesDB[string] | null }) {
  if (!chargeData) return null;
  const hasAsia = hasMeaningfulData(chargeData.asia);
  const hasPara = chargeData.para != null && hasMeaningfulData(chargeData.para);
  if (!hasAsia && !hasPara) return null;
  return (
    <div className="mb-5 pb-5 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-3">積算根拠（別紙1-1より）</p>
      {hasAsia && <RoomChargeSectionTable label="◆ アジア競技大会" section={chargeData.asia} />}
      {hasPara && <RoomChargeSectionTable label="◆ アジアパラ競技大会" section={chargeData.para!} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────


function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded-full leading-none ${
        active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
      }`}
    >
      {count}
    </span>
  );
}

function CostTable({
  items,
  onEdit,
  onDelete,
  showCategory = true,
}: {
  items: CostItem[];
  onEdit: (item: CostItem) => void;
  onDelete: (id: string, desc: string) => void;
  showCategory?: boolean;
}) {
  const totalBudget = items.reduce((s, i) => s + i.budgetAmount, 0);
  const totalActual = items.reduce((s, i) => s + i.actualAmount, 0);
  const totalVariance = calcVariance(totalBudget, totalActual);

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-5">
      <table className="w-full text-sm min-w-[580px]">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50/70">
            <th className="text-left py-2 px-3 font-medium">大会</th>
            {showCategory && (
              <th className="text-left py-2 px-3 font-medium">費目</th>
            )}
            <th className="text-left py-2 px-3 font-medium">内容</th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              単価×人数×泊
            </th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              予算額
            </th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              実績額
            </th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              乖離
            </th>
            <th className="text-left py-2 px-3 font-medium">備考</th>
            <th className="py-2 px-2 w-16" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const v = calcVariance(item.budgetAmount, item.actualAmount);
            const hasBreakdown =
              item.unitPrice > 0 && item.personCount > 0 && item.nights > 0;
            return (
              <tr
                key={item.id}
                className="border-b border-gray-50 hover:bg-blue-50/30 group transition-colors"
              >
                <td className="py-2.5 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                      EVENT_COLORS[item.event]
                    }`}
                  >
                    {EVENT_LABELS[item.event]}
                  </span>
                </td>
                {showCategory && (
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                        CATEGORY_COLORS[item.category]
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>
                )}
                <td className="py-2.5 px-3 text-gray-700 font-medium">
                  {item.description}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-400 text-xs whitespace-nowrap tabular-nums">
                  {hasBreakdown
                    ? `${item.unitPrice.toLocaleString("ja-JP")} × ${
                        item.personCount
                      } × ${item.nights}`
                    : "—"}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-500 whitespace-nowrap tabular-nums">
                  {formatCurrency(item.budgetAmount)}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-800 whitespace-nowrap tabular-nums">
                  {formatCurrency(item.actualAmount)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right whitespace-nowrap tabular-nums text-sm font-medium ${v.className}`}
                >
                  {v.text}
                </td>
                <td className="py-2.5 px-3 text-gray-400 text-xs max-w-[140px] truncate">
                  {item.notes || "—"}
                </td>
                <td className="py-2 px-2 whitespace-nowrap">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1 text-gray-300 hover:text-blue-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="編集"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(item.id, item.description)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="削除"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
            <td
              colSpan={showCategory ? 4 : 3}
              className="py-2.5 px-3 text-gray-600"
            >
              合計
            </td>
            <td className="py-2.5 px-3 text-right text-gray-600 whitespace-nowrap tabular-nums">
              {formatCurrency(totalBudget)}
            </td>
            <td className="py-2.5 px-3 text-right text-gray-900 whitespace-nowrap tabular-nums">
              {formatCurrency(totalActual)}
            </td>
            <td
              className={`py-2.5 px-3 text-right whitespace-nowrap tabular-nums ${totalVariance.className}`}
            >
              {totalVariance.text}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Category view components
// ─────────────────────────────────────────────

type CategoryStats = Record<
  CostCategory,
  { items: CostItem[]; budget: number; actual: number }
>;

function AllCategoriesView({
  categoryStats,
  allItems,
  onAdd,
  onEdit,
  onDelete,
}: {
  categoryStats: CategoryStats;
  allItems: CostItem[];
  onAdd: (cat?: CostCategory) => void;
  onEdit: (item: CostItem) => void;
  onDelete: (id: string, desc: string) => void;
}) {
  if (allItems.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-base mb-3">費用データがありません</p>
        <button
          onClick={() => onAdd()}
          className="text-sm text-blue-600 hover:underline"
        >
          ＋ 費用を追加する
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {COST_CATEGORIES.map((cat) => {
        const { items, budget, actual } = categoryStats[cat];
        if (items.length === 0) return null;
        const v = calcVariance(budget, actual);
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[cat]}`}
                >
                  {cat}
                </span>
                <span className="text-sm text-gray-500 tabular-nums">
                  予算 {formatCurrency(budget)}
                </span>
                <span className="text-gray-300 text-xs">→</span>
                <span className="text-sm font-medium text-gray-700 tabular-nums">
                  実績 {formatCurrency(actual)}
                </span>
                <span className={`text-sm ${v.className}`}>{v.text}</span>
              </div>
              <button
                onClick={() => onAdd(cat)}
                className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-100 border border-blue-200 transition-colors flex-shrink-0"
              >
                ＋ 追加
              </button>
            </div>
            <CostTable
              items={items}
              onEdit={onEdit}
              onDelete={onDelete}
              showCategory={false}
            />
          </div>
        );
      })}
      <div className="pt-3 flex justify-end border-t border-gray-100">
        <button
          onClick={() => onAdd()}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          ＋ 費用追加
        </button>
      </div>
    </div>
  );
}

function SingleCategoryView({
  stats,
  onAdd,
  onEdit,
  onDelete,
}: {
  stats: { items: CostItem[]; budget: number; actual: number };
  onAdd: () => void;
  onEdit: (item: CostItem) => void;
  onDelete: (id: string, desc: string) => void;
}) {
  const { items, budget, actual } = stats;
  const v = calcVariance(budget, actual);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-gray-500">
            予算:{" "}
            <span className="font-medium text-gray-700 tabular-nums">
              {formatCurrency(budget)}
            </span>
          </span>
          <span className="text-gray-500">
            実績:{" "}
            <span className="font-semibold text-gray-800 tabular-nums">
              {formatCurrency(actual)}
            </span>
          </span>
          <span className={`font-medium ${v.className}`}>{v.text}</span>
        </div>
        <button
          onClick={onAdd}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          ＋ 費用追加
        </button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="mb-3">この費目にはデータがありません</p>
          <button
            onClick={onAdd}
            className="text-sm text-blue-600 hover:underline"
          >
            ＋ 費用を追加する
          </button>
        </div>
      ) : (
        <CostTable
          items={items}
          onEdit={onEdit}
          onDelete={onDelete}
          showCategory={false}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────

export default function HotelDetailClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400 text-lg">読み込み中...</div></div>}>
      <HotelDetailInner />
    </Suspense>
  );
}

function HotelDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") ?? "";
  const router = useRouter();
  const { hotels, initialized, addCostItem, updateCostItem, deleteCostItem, updateHotel } =
    useHotels();
  const [hotelEditOpen, setHotelEditOpen] = useState(false);
  const [facilityInfoOpen, setFacilityInfoOpen] = useState(false);
  const [functionRoomOpen, setFunctionRoomOpen] = useState(false);

  // ── Room charge DB (from uploaded Excel or static JSON) ───────────────────
  const [roomChargeDb, setRoomChargeDb] = useState<RoomChargesDB | null>(null);
  useEffect(() => {
    try {
      const s = localStorage.getItem(ROOM_CHARGES_STORAGE_KEY);
      if (s) { setRoomChargeDb(JSON.parse(s) as RoomChargesDB); return; }
    } catch { /* ignore */ }
    fetch("/budget-app/room-charges.json")
      .then((r) => r.json())
      .then((data) => setRoomChargeDb(data as RoomChargesDB))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === ROOM_CHARGES_STORAGE_KEY && e.newValue) {
        try { setRoomChargeDb(JSON.parse(e.newValue) as RoomChargesDB); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const [hotelSearchQuery, setHotelSearchQuery] = useState("");
  const [hotelDropdownOpen, setHotelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setHotelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredHotelsForDropdown = useMemo(() => {
    const q = hotelSearchQuery.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.location ?? "").toLowerCase().includes(q) ||
        (h.facilityNo ?? "").toLowerCase().includes(q)
    );
  }, [hotels, hotelSearchQuery]);

  const hotel = useMemo(
    () => hotels.find((h) => h.id === id),
    [hotels, id]
  );

  const roomChargeData = useMemo(() => {
    if (!hotel?.facilityNo || !roomChargeDb) return null;
    const key = String(parseInt(hotel.facilityNo, 10));
    return roomChargeDb[key] ?? null;
  }, [hotel, roomChargeDb]);

  const [activeCategory, setActiveCategory] = useState<CostCategory | "all">(
    "all"
  );
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<
    CostCategory | undefined
  >(undefined);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-5xl mb-1">🏨</div>
        <div className="text-red-500 text-lg font-medium">
          ホテルが見つかりませんでした
        </div>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← メイン画面に戻る
        </Link>
      </div>
    );
  }

  const totals = calcHotelTotals(hotel);
  const variance = calcVariance(totals.budget, totals.actual);
  const executedTotal = hotel.costItems.reduce(
    (s, i) => s + (i.executedAmount || 0),
    0
  );
  const executionPct =
    totals.actual > 0
      ? Math.min(100, Math.round((executedTotal / totals.actual) * 100))
      : 0;

  const categoryStats: CategoryStats = COST_CATEGORIES.reduce((acc, cat) => {
    const items = hotel.costItems.filter((i) => i.category === cat);
    acc[cat] = {
      items,
      budget: items.reduce((s, i) => s + i.budgetAmount, 0),
      actual: items.reduce((s, i) => s + i.actualAmount, 0),
    };
    return acc;
  }, {} as CategoryStats);

  const handleOpenAddModal = (cat?: CostCategory) => {
    setEditingItem(null);
    setModalDefaultCategory(
      cat ?? (activeCategory !== "all" ? activeCategory : undefined)
    );
    setCostModalOpen(true);
  };

  const handleOpenEditModal = (item: CostItem) => {
    setEditingItem(item);
    setModalDefaultCategory(undefined);
    setCostModalOpen(true);
  };

  const handleDelete = (itemId: string, desc: string) => {
    if (confirm(`「${desc}」を削除しますか？`)) {
      deleteCostItem(hotel.id, itemId);
    }
  };

  const handleSubmit = (data: Omit<CostItem, "id">) => {
    if (editingItem) {
      updateCostItem(hotel.id, editingItem.id, data);
    } else {
      addCostItem(hotel.id, data);
    }
    setCostModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 flex-shrink-0 transition-colors"
          >
            ← 戻る
          </button>
          <span className="text-gray-200 flex-shrink-0 select-none">|</span>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 flex-shrink-0 transition-colors"
          >
            メイン画面
          </Link>
          <span className="text-gray-300 flex-shrink-0 select-none">/</span>
          {/* Hotel switcher dropdown */}
          <div className="flex items-center gap-2 flex-1 min-w-0 relative" ref={dropdownRef}>
            <button
              onClick={() => { setHotelDropdownOpen((v) => !v); setHotelSearchQuery(""); }}
              className="flex items-center gap-2 min-w-0 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors max-w-full"
              title="ホテルを切り替え"
            >
              {hotel.facilityNo && (
                <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex-shrink-0">
                  {hotel.facilityNo}
                </span>
              )}
              <h1 className="font-bold text-gray-900 truncate text-base sm:text-lg">
                {hotel.name}
              </h1>
              {hotel.contractStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${CONTRACT_STATUS_COLORS[hotel.contractStatus]}`}>
                  {hotel.contractStatus}
                </span>
              )}
              <span className="text-gray-400 text-xs flex-shrink-0">▼</span>
            </button>

            {hotelDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="p-2 border-b border-gray-100">
                  <input
                    autoFocus
                    type="text"
                    value={hotelSearchQuery}
                    onChange={(e) => setHotelSearchQuery(e.target.value)}
                    placeholder="ホテル名・施設番号で検索..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="overflow-y-auto max-h-64">
                  {filteredHotelsForDropdown.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">見つかりません</div>
                  ) : (
                    filteredHotelsForDropdown.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          router.push(`/hotels/detail?id=${h.id}`);
                          setHotelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${h.id === id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                      >
                        {h.facilityNo && (
                          <span className="font-mono text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">
                            {h.facilityNo}
                          </span>
                        )}
                        <span className="truncate">{h.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white flex items-center gap-1.5 flex-shrink-0 transition-colors"
          >
            <span>⚙</span>
            <span className="hidden sm:inline">管理画面</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* 提供客室 / 保有客室 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-xl">🏨</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">提供客室 / 保有客室</div>
              <div className="tabular-nums font-bold text-lg text-blue-600">
                {hotel.offeredRooms ?? "—"}
                <span className="text-gray-400 font-normal text-sm mx-1">/</span>
                <span className="text-gray-700">{hotel.totalRooms ?? "—"}</span>
              </div>
            </div>
          </div>
          {/* 予算総額 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 text-xl">💴</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">予算総額</div>
              <div className="text-base font-bold text-gray-800 tabular-nums">{formatCurrency(totals.budget)}</div>
            </div>
          </div>
          {/* 実績額 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0 text-xl">📊</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">実績額</div>
              <div className="text-base font-bold text-gray-800 tabular-nums">{formatCurrency(totals.actual)}</div>
            </div>
          </div>
          {/* 予実乖離 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 text-xl">📉</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">予実乖離</div>
              <div className={`text-base font-bold tabular-nums ${variance.className}`}>{variance.text}</div>
            </div>
          </div>
          {/* 執行済額 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-xl">✅</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">執行済額</div>
              <div className="text-base font-bold text-gray-800 tabular-nums">{formatCurrency(executedTotal)}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${executionPct}%` }} />
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{executionPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Accordion: 施設情報 ＋ ファンクションルーム ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {/* 施設情報 */}
          <div>
            <button
              onClick={() => setFacilityInfoOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm transition-transform duration-200" style={{ display: "inline-block", transform: facilityInfoOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                <span className="text-sm font-semibold text-gray-700">施設情報</span>
                {hotel.contractStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_STATUS_COLORS[hotel.contractStatus]}`}>{hotel.contractStatus}</span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setHotelEditOpen(true); }}
                className="text-xs text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                title="施設情報を編集"
              >
                ✏️
              </button>
            </button>
            {facilityInfoOpen && (
              <div className="px-5 pb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {hotel.location && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 flex-shrink-0">📍</span>
                      <span className="text-gray-700">{hotel.location}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-gray-400 flex-shrink-0">📅</span>
                    <span className="text-gray-700">{formatDateRange(hotel.contractStartDate, hotel.contractEndDate)}</span>
                  </div>
                  {hotel.facilityNo && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 flex-shrink-0">🔢</span>
                      <span className="font-mono text-gray-700">施設番号: {hotel.facilityNo}</span>
                    </div>
                  )}
                </div>
                {hotel.groups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hotel.groups.map((g) => (
                      <span key={g} className={`text-xs px-2 py-0.5 rounded-full ${GROUP_COLORS[g]}`}>{g}</span>
                    ))}
                  </div>
                )}
                {hotel.roomTypes.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">客室タイプ</div>
                    <div className="flex flex-wrap gap-2">
                      {hotel.roomTypes.map((r) => (
                        <span key={r.id} className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                          🛏 {r.typeName} × {r.contractQuantity}室
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {hotel.notes && (
                  <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 leading-relaxed">
                    📝 {hotel.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ファンクションルーム */}
          <div>
            <button
              onClick={() => setFunctionRoomOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm transition-transform duration-200" style={{ display: "inline-block", transform: functionRoomOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                <span className="text-sm font-semibold text-gray-700">ファンクションルーム</span>
                <span className="text-xs text-gray-500">
                  保有: {hotel.totalFunctionRooms ?? "—"} / 提供: {hotel.offeredFunctionRooms ?? "—"}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setHotelEditOpen(true); }}
                className="text-xs text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                title="ファンクションルーム情報を編集"
              >
                ✏️
              </button>
            </button>
            {functionRoomOpen && (
              <div className="px-5 pb-4">
                <div className="grid grid-cols-2 gap-4 max-w-xs">
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                    <div className="text-xs text-purple-500 mb-1">保有室数</div>
                    <div className="text-2xl font-bold text-purple-700 tabular-nums">{hotel.totalFunctionRooms ?? "—"}</div>
                    {hotel.totalFunctionRooms != null && <div className="text-xs text-purple-400">室</div>}
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                    <div className="text-xs text-blue-500 mb-1">提供室数</div>
                    <div className="text-2xl font-bold text-blue-700 tabular-nums">{hotel.offeredFunctionRooms ?? "—"}</div>
                    {hotel.offeredFunctionRooms != null && <div className="text-xs text-blue-400">室</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* ── Category tabs + content ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Tab nav */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex px-4 sm:px-5 min-w-max">
              <TabBtn
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
              >
                すべて
                <CountBadge
                  count={hotel.costItems.length}
                  active={activeCategory === "all"}
                />
              </TabBtn>
              {COST_CATEGORIES.map((cat) => {
                const count = categoryStats[cat].items.length;
                return (
                  <TabBtn
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                    {count > 0 && (
                      <CountBadge
                        count={count}
                        active={activeCategory === cat}
                      />
                    )}
                  </TabBtn>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5">
            {activeCategory === "all" ? (
              <AllCategoriesView
                categoryStats={categoryStats}
                allItems={hotel.costItems}
                onAdd={handleOpenAddModal}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
              />
            ) : (
              <>
                {activeCategory === "客室確保費" && (
                  <RoomChargeInTab chargeData={roomChargeData} />
                )}
                <SingleCategoryView
                  stats={categoryStats[activeCategory]}
                  onAdd={() => handleOpenAddModal(activeCategory)}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDelete}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {costModalOpen && (
        <CostItemModal
          item={editingItem}
          defaultCategory={modalDefaultCategory}
          onSubmit={handleSubmit}
          onClose={() => setCostModalOpen(false)}
        />
      )}

      {hotelEditOpen && hotel && (
        <HotelFormModal
          hotel={hotel}
          onSubmit={(data) => {
            updateHotel(hotel.id, data);
            setHotelEditOpen(false);
          }}
          onClose={() => setHotelEditOpen(false)}
        />
      )}
    </div>
  );
}
