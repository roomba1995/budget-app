"use client";

import {
  Hotel,
  CostItem,
  GROUP_COLORS,
  CATEGORY_COLORS,
  calcHotelTotals,
  calcVariance,
  formatCurrency,
  formatDateRange,
} from "@/types";

interface Props {
  hotel: Hotel;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddCostItem: () => void;
  onEditCostItem: (item: CostItem) => void;
  onDeleteCostItem: (itemId: string, desc: string) => void;
}

export default function HotelCard({
  hotel,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddCostItem,
  onEditCostItem,
  onDeleteCostItem,
}: Props) {
  const { budget, actual } = calcHotelTotals(hotel);
  const variance = calcVariance(budget, actual);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{hotel.name}</h3>
              {hotel.groups.map((g) => (
                <span
                  key={g}
                  className={`text-xs px-2 py-0.5 rounded-full ${GROUP_COLORS[g]}`}
                >
                  {g}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-sm text-gray-500">
              {hotel.location && <span>📍 {hotel.location}</span>}
              <span>
                📅 {formatDateRange(hotel.contractStartDate, hotel.contractEndDate)}
              </span>
              {hotel.roomTypes.length > 0 && (
                <span>
                  🛏{" "}
                  {hotel.roomTypes
                    .map((r) => `${r.typeName}×${r.contractQuantity}室`)
                    .join(" / ")}
                </span>
              )}
            </div>
          </div>

          {/* Right: totals + actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-gray-400">予算 / 実績</div>
              <div className="text-base font-medium text-gray-700 whitespace-nowrap">
                {formatCurrency(budget)} / {formatCurrency(actual)}
              </div>
              <div className={`text-sm ${variance.className}`}>
                {variance.text}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="編集"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="削除"
              >
                🗑️
              </button>
              <span
                className={`text-gray-400 text-xs ml-1 transition-transform inline-block ${
                  expanded ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </div>
          </div>
        </div>

        {/* Mobile: totals row */}
        <div className="sm:hidden mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            予算 {formatCurrency(budget)} / 実績 {formatCurrency(actual)}
          </span>
          <span className={variance.className}>{variance.text}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-5">
          {hotel.notes && (
            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700">
              📝 {hotel.notes}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">費用明細</h4>
            <button
              onClick={onAddCostItem}
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              ＋ 費用追加
            </button>
          </div>

          {hotel.costItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-base">
              費用データがありません。「費用追加」から登録してください。
            </div>
          ) : (
            <div className="mt-2 overflow-x-auto -mx-4 px-4">
              <table className="w-full text-base min-w-[640px]">
                <thead>
                  <tr className="text-sm text-gray-500 border-b border-gray-100">
                    <th className="text-left py-2 pr-3 font-medium w-32">
                      費目
                    </th>
                    <th className="text-left py-2 pr-3 font-medium">内容</th>
                    <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">
                      予算額
                    </th>
                    <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">
                      実績額
                    </th>
                    <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">
                      乖離
                    </th>
                    <th className="text-left py-2 pr-3 font-medium">備考</th>
                    <th className="py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {hotel.costItems.map((item) => {
                    const v = calcVariance(item.budgetAmount, item.actualAmount);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-50 hover:bg-gray-50 group"
                      >
                        <td className="py-2 pr-3">
                          <span
                            className={`text-sm px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_COLORS[item.category]}`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-700">
                          {item.description}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-500 whitespace-nowrap tabular-nums">
                          {formatCurrency(item.budgetAmount)}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-800 font-medium whitespace-nowrap tabular-nums">
                          {formatCurrency(item.actualAmount)}
                        </td>
                        <td
                          className={`py-2 pr-3 text-right whitespace-nowrap tabular-nums ${v.className}`}
                        >
                          {v.text}
                        </td>
                        <td className="py-2 pr-3 text-gray-400 text-sm max-w-[160px] truncate">
                          {item.notes}
                        </td>
                        <td className="py-2 whitespace-nowrap">
                          <button
                            onClick={() => onEditCostItem(item)}
                            className="p-1 text-gray-300 hover:text-blue-500 rounded transition-colors"
                            title="編集"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              onDeleteCostItem(item.id, item.description)
                            }
                            className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
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
                  <tr className="bg-gray-50 font-semibold text-base border-t border-gray-200">
                    <td colSpan={2} className="py-2.5 px-2 text-gray-600">
                      合計
                    </td>
                    <td className="py-2.5 pr-3 text-right text-gray-600 whitespace-nowrap tabular-nums">
                      {formatCurrency(budget)}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-gray-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(actual)}
                    </td>
                    <td
                      className={`py-2.5 pr-3 text-right whitespace-nowrap tabular-nums ${variance.className}`}
                    >
                      {variance.text}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
