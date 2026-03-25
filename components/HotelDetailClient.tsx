"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  const { hotels, initialized, addCostItem, updateCostItem, deleteCostItem } =
    useHotels();

  const hotel = useMemo(
    () => hotels.find((h) => h.id === id),
    [hotels, id]
  );

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
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 flex-shrink-0 transition-colors"
          >
            ← メイン画面
          </Link>
          <span className="text-gray-300 flex-shrink-0 select-none">/</span>
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            {hotel.facilityNo && (
              <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex-shrink-0">
                {hotel.facilityNo}
              </span>
            )}
            <h1 className="font-bold text-gray-900 truncate text-base sm:text-lg">
              {hotel.name}
            </h1>
            {hotel.contractStatus && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  CONTRACT_STATUS_COLORS[hotel.contractStatus]
                }`}
              >
                {hotel.contractStatus}
              </span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── Hotel info card ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 space-y-2.5">
              {hotel.groups.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hotel.groups.map((g) => (
                    <span
                      key={g}
                      className={`text-xs px-2 py-0.5 rounded-full ${GROUP_COLORS[g]}`}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
                {hotel.location && <span>📍 {hotel.location}</span>}
                <span>
                  📅{" "}
                  {formatDateRange(
                    hotel.contractStartDate,
                    hotel.contractEndDate
                  )}
                </span>
              </div>
              {hotel.roomTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hotel.roomTypes.map((r) => (
                    <span
                      key={r.id}
                      className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full"
                    >
                      🛏 {r.typeName} × {r.contractQuantity}室
                    </span>
                  ))}
                </div>
              )}
            </div>
            {hotel.notes && (
              <div className="sm:max-w-xs px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 leading-relaxed">
                📝 {hotel.notes}
              </div>
            )}
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1.5">予算総額</div>
            <div className="text-xl font-bold text-gray-800 tabular-nums">
              {formatCurrency(totals.budget)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1.5">実績額</div>
            <div className="text-xl font-bold text-gray-800 tabular-nums">
              {formatCurrency(totals.actual)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1.5">予実乖離</div>
            <div
              className={`text-xl font-bold tabular-nums ${variance.className}`}
            >
              {variance.text}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1.5">執行済額</div>
            <div className="text-xl font-bold text-gray-800 tabular-nums">
              {formatCurrency(executedTotal)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${executionPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {executionPct}%
              </span>
            </div>
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
              <SingleCategoryView
                stats={categoryStats[activeCategory]}
                onAdd={() => handleOpenAddModal(activeCategory)}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
              />
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
    </div>
  );
}
