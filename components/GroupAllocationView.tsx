"use client";

import { useState, useMemo } from "react";
import { Hotel, Group, GROUPS, GROUP_COLORS } from "@/types";
import { formatCurrency } from "@/types";

interface Props {
  hotels: Hotel[];
}

function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function formatDateShort(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function GroupAllocationView({ hotels }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<Group>(GROUPS[0]);

  const groupHotels = useMemo(
    () => hotels.filter((h) => h.groups.includes(selectedGroup)),
    [hotels, selectedGroup]
  );

  // タイムライン用の日付範囲を計算
  const { dateRange } = useMemo(() => {
    const starts = groupHotels
      .map((h) => h.contractStartDate)
      .filter(Boolean)
      .map((d) => new Date(d));
    const ends = groupHotels
      .map((h) => h.contractEndDate)
      .filter(Boolean)
      .map((d) => new Date(d));
    if (starts.length === 0) return { dateRange: [] };
    const min = new Date(Math.min(...starts.map((d) => d.getTime())));
    const max = new Date(Math.max(...ends.map((d) => d.getTime())));
    const dates: Date[] = [];
    for (let d = new Date(min); d <= max; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return { dateRange: dates };
  }, [groupHotels]);

  // グループ合計
  const totals = useMemo(() => {
    return groupHotels.reduce(
      (acc, h) => {
        const roomCosts = h.costItems.filter((i) => i.category === "客室確保費");
        const budget = roomCosts.reduce((s, i) => s + i.budgetAmount, 0);
        const actual = roomCosts.reduce((s, i) => s + i.actualAmount, 0);
        return {
          budget: acc.budget + budget,
          actual: acc.actual + actual,
          offeredRooms: acc.offeredRooms + (h.offeredRooms ?? 0),
          nights: acc.nights + nightsBetween(h.contractStartDate, h.contractEndDate),
        };
      },
      { budget: 0, actual: 0, offeredRooms: 0, nights: 0 }
    );
  }, [groupHotels]);

  return (
    <div className="space-y-4">
      {/* グループ選択 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium">ステークホルダー選択</div>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                g === selectedGroup
                  ? GROUP_COLORS[g]
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">対象ホテル数</div>
          <div className="text-2xl font-bold text-gray-800">
            {groupHotels.length}
            <span className="text-sm font-normal text-gray-500 ml-1">件</span>
          </div>
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
          <div className="text-lg font-bold text-gray-800">
            {totals.budget > 0 ? formatCurrency(totals.budget) : "—"}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">客室確保費（実績）</div>
          <div className="text-lg font-bold text-gray-800">
            {totals.actual > 0 ? formatCurrency(totals.actual) : "—"}
          </div>
        </div>
      </div>

      {/* ホテル一覧表 */}
      {groupHotels.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          「{selectedGroup}」のホテルは登録されていません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {selectedGroup} — ホテル配宿一覧
            </h3>
            <span className="text-xs text-gray-400">{groupHotels.length}件</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                  <th className="text-left py-3 px-4 font-medium">施設名</th>
                  <th className="text-left py-3 px-3 font-medium">所在地</th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap">
                    保有<br />客室数
                  </th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap">
                    提供<br />客室数
                  </th>
                  <th className="text-center py-3 px-3 font-medium whitespace-nowrap">配宿競技<br /><span className="text-gray-400 font-normal">（予定）</span></th>
                  <th className="text-center py-3 px-3 font-medium">CI</th>
                  <th className="text-center py-3 px-3 font-medium">CO</th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap">
                    確保<br />泊数
                  </th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap">
                    1日あたり<br />客室費（予算）
                  </th>
                  <th className="text-right py-3 px-4 font-medium whitespace-nowrap">
                    客室総計<br />（予算）
                  </th>
                  <th className="text-center py-3 px-3 font-medium whitespace-nowrap">
                    ファンクション<br />保有 / 提供
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupHotels.map((h) => {
                  const roomCosts = h.costItems.filter(
                    (i) => i.category === "客室確保費"
                  );
                  const budgetTotal = roomCosts.reduce(
                    (s, i) => s + i.budgetAmount,
                    0
                  );
                  const nights = nightsBetween(
                    h.contractStartDate,
                    h.contractEndDate
                  );
                  const dailyBudget =
                    nights > 0 && budgetTotal > 0
                      ? Math.round(budgetTotal / nights)
                      : null;

                  return (
                    <tr
                      key={h.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">
                          {h.facilityNo && (
                            <span className="font-mono text-xs text-blue-600 mr-1.5">
                              {h.facilityNo}
                            </span>
                          )}
                          {h.name}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500">
                        {h.location || "—"}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-600 whitespace-nowrap">
                        {h.totalRooms != null ? `${h.totalRooms.toLocaleString()}室` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-blue-600 whitespace-nowrap">
                        {h.offeredRooms != null ? `${h.offeredRooms.toLocaleString()}室` : "—"}
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-gray-400 italic">
                        —
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600 whitespace-nowrap">
                        {formatDateShort(h.contractStartDate)}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600 whitespace-nowrap">
                        {formatDateShort(h.contractEndDate)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-600 whitespace-nowrap">
                        {nights > 0 ? `${nights}泊` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-600 whitespace-nowrap">
                        {dailyBudget != null ? formatCurrency(dailyBudget) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-gray-800 whitespace-nowrap">
                        {budgetTotal > 0 ? formatCurrency(budgetTotal) : "—"}
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-gray-500 whitespace-nowrap">
                        {h.totalFunctionRooms != null || h.offeredFunctionRooms != null
                          ? `${h.totalFunctionRooms ?? "—"} / ${h.offeredFunctionRooms ?? "—"}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                  <td className="py-3 px-4 text-gray-700">合計</td>
                  <td />
                  <td />
                  <td className="py-3 px-3 text-right tabular-nums text-blue-600 whitespace-nowrap">
                    {totals.offeredRooms > 0
                      ? `${totals.offeredRooms.toLocaleString()}室`
                      : "—"}
                  </td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td className="py-3 px-4 text-right tabular-nums text-gray-900 whitespace-nowrap">
                    {totals.budget > 0 ? formatCurrency(totals.budget) : "—"}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 配宿スケジュール（ガントチャート） */}
      {groupHotels.length > 0 && dateRange.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">
              配宿スケジュール
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              チェックイン〜チェックアウト期間を表示
            </p>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${dateRange.length * 30 + 220}px` }}>
              {/* 月ヘッダー */}
              <div className="flex border-b border-gray-100 bg-gray-50">
                <div className="w-52 flex-shrink-0" />
                {dateRange.reduce<{ month: number; count: number }[]>(
                  (acc, d) => {
                    const m = d.getMonth() + 1;
                    if (acc.length === 0 || acc[acc.length - 1].month !== m) {
                      acc.push({ month: m, count: 1 });
                    } else {
                      acc[acc.length - 1].count++;
                    }
                    return acc;
                  },
                  []
                ).map((g, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 text-xs font-semibold text-gray-500 text-center py-1.5 border-l border-gray-200"
                    style={{ width: `${g.count * 30}px` }}
                  >
                    {g.month}月
                  </div>
                ))}
              </div>
              {/* 日付ヘッダー */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <div className="w-52 flex-shrink-0 px-4 py-2 text-xs font-medium text-gray-600">
                  施設名
                </div>
                {dateRange.map((d, i) => {
                  const dow = d.getDay();
                  return (
                    <div
                      key={i}
                      className={`w-[30px] flex-shrink-0 text-center text-xs py-1.5 border-l border-gray-100 ${
                        dow === 0
                          ? "text-red-400 bg-red-50"
                          : dow === 6
                          ? "text-blue-400 bg-blue-50"
                          : "text-gray-500"
                      }`}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
              {/* ホテル行 */}
              {groupHotels.map((h) => {
                const ciDate = h.contractStartDate
                  ? new Date(h.contractStartDate)
                  : null;
                const coDate = h.contractEndDate
                  ? new Date(h.contractEndDate)
                  : null;

                return (
                  <div
                    key={h.id}
                    className="flex items-center border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-52 flex-shrink-0 px-4 py-2">
                      <div className="text-xs font-medium text-gray-700 truncate">
                        {h.name}
                      </div>
                      {h.offeredRooms != null && (
                        <div className="text-xs text-blue-500">
                          {h.offeredRooms}室
                        </div>
                      )}
                    </div>
                    {dateRange.map((d, i) => {
                      const dayStart = new Date(d);
                      dayStart.setHours(0, 0, 0, 0);
                      const inRange =
                        ciDate && coDate && dayStart >= ciDate && dayStart < coDate;
                      const isCI =
                        ciDate &&
                        dayStart.toDateString() === ciDate.toDateString();
                      const isCO =
                        coDate &&
                        new Date(coDate.getTime() - 1).toDateString() ===
                          dayStart.toDateString();
                      const dow = d.getDay();

                      return (
                        <div
                          key={i}
                          className={`w-[30px] h-9 flex-shrink-0 flex items-center justify-center border-l border-gray-100 ${
                            dow === 0
                              ? "bg-red-50/40"
                              : dow === 6
                              ? "bg-blue-50/40"
                              : ""
                          }`}
                        >
                          {inRange && (
                            <div
                              className={`h-5 w-full mx-0.5 rounded-sm ${
                                isCI
                                  ? "bg-blue-500 rounded-l-full"
                                  : isCO
                                  ? "bg-blue-500 rounded-r-full"
                                  : "bg-blue-400"
                              }`}
                            />
                          )}
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

      {groupHotels.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          ホテル編集でグループを割り当てると、ここに表示されます。
        </p>
      )}
    </div>
  );
}
