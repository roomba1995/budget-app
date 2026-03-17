"use client";

import { useState } from "react";
import {
  Hotel,
  COST_CATEGORIES,
  CATEGORY_COLORS,
  GameEvent,
  formatCurrency,
} from "@/types";

interface Props {
  hotels: Hotel[];
}

interface CategoryRow {
  category: string;
  event: GameEvent;
  budget: number;
  executed: number;
  planned: number;
  forecast: number;
}

export default function ExecutionDashboard({ hotels }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<"all" | GameEvent>("all");

  // 全CostItemをフラット化し、足りないフィールドに0をデフォルト
  const allItems = hotels.flatMap((h) =>
    h.costItems.map((i) => ({
      ...i,
      executedAmount: i.executedAmount ?? 0,
      plannedAmount: i.plannedAmount ?? 0,
      forecastAmount: i.forecastAmount ?? 0,
    }))
  );

  const filtered =
    selectedEvent === "all"
      ? allItems
      : allItems.filter((i) => i.event === selectedEvent);

  // 全体サマリー
  const totalBudget = filtered.reduce((s, i) => s + i.budgetAmount, 0);
  const totalExecuted = filtered.reduce((s, i) => s + i.executedAmount, 0);
  const totalPlanned = filtered.reduce((s, i) => s + i.plannedAmount, 0);
  const totalForecast = filtered.reduce((s, i) => s + i.forecastAmount, 0);
  const totalVariance =
    totalBudget - (totalExecuted + totalPlanned + totalForecast);

  // 費目別集計
  const rows: CategoryRow[] = [];
  const events: GameEvent[] =
    selectedEvent === "all" ? ["asia", "para"] : [selectedEvent];

  for (const cat of COST_CATEGORIES) {
    for (const ev of events) {
      const items = allItems.filter(
        (i) => i.category === cat && i.event === ev
      );
      if (items.length === 0) continue;
      rows.push({
        category: cat,
        event: ev,
        budget: items.reduce((s, i) => s + i.budgetAmount, 0),
        executed: items.reduce((s, i) => s + i.executedAmount, 0),
        planned: items.reduce((s, i) => s + i.plannedAmount, 0),
        forecast: items.reduce((s, i) => s + i.forecastAmount, 0),
      });
    }
  }

  const executionRate =
    totalBudget > 0
      ? Math.round((totalExecuted / totalBudget) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* イベントフィルター */}
      <div className="flex gap-2">
        {(["all", "asia", "para"] as const).map((ev) => (
          <button
            key={ev}
            onClick={() => setSelectedEvent(ev)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedEvent === ev
                ? ev === "asia"
                  ? "bg-orange-500 text-white border-orange-500"
                  : ev === "para"
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
            }`}
          >
            {ev === "all" ? "全体" : ev === "asia" ? "アジア大会" : "パラ大会"}
          </button>
        ))}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="予算総額"
          value={totalBudget}
          colorClass="border-gray-200 bg-white"
          valueClass="text-gray-900"
        />
        <SummaryCard
          label="執行済み額"
          value={totalExecuted}
          colorClass="border-emerald-200 bg-emerald-50"
          valueClass="text-emerald-700"
          sub={`${executionRate}%`}
        />
        <SummaryCard
          label="執行予定額"
          value={totalPlanned}
          colorClass="border-blue-200 bg-blue-50"
          valueClass="text-blue-700"
        />
        <SummaryCard
          label="今後の見込み"
          value={totalForecast}
          colorClass="border-yellow-200 bg-yellow-50"
          valueClass="text-yellow-700"
        />
        <SummaryCard
          label="過不足額"
          value={Math.abs(totalVariance)}
          colorClass={
            totalVariance >= 0
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }
          valueClass={totalVariance >= 0 ? "text-emerald-700" : "text-red-600"}
          prefix={
            totalVariance === 0 ? "±" : totalVariance > 0 ? "余剰 " : "不足 "
          }
        />
      </div>

      {/* 執行進捗バー */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">執行進捗</span>
            <span className="tabular-nums">
              {formatCurrency(totalExecuted)} / {formatCurrency(totalBudget)}
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all"
              style={{
                width: `${Math.min((totalExecuted / totalBudget) * 100, 100)}%`,
              }}
            />
            <div
              className="bg-blue-400 transition-all"
              style={{
                width: `${Math.min((totalPlanned / totalBudget) * 100, 100 - (totalExecuted / totalBudget) * 100)}%`,
              }}
            />
            <div
              className="bg-yellow-400 transition-all"
              style={{
                width: `${Math.min((totalForecast / totalBudget) * 100, Math.max(0, 100 - ((totalExecuted + totalPlanned) / totalBudget) * 100))}%`,
              }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              執行済み {executionRate}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
              予定{" "}
              {totalBudget > 0
                ? Math.round((totalPlanned / totalBudget) * 100)
                : 0}
              %
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              見込み{" "}
              {totalBudget > 0
                ? Math.round((totalForecast / totalBudget) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      )}

      {/* 費目別テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">費目別・執行状況</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            各費目の予算・執行済み・予定・見込みの内訳
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                <th className="text-left py-3 px-4 font-medium text-gray-600 w-40">
                  費目
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600 w-24">
                  大会
                </th>
                <th className="text-right py-3 px-3 font-medium text-gray-600 whitespace-nowrap">
                  予算額
                </th>
                <th className="text-right py-3 px-3 font-medium text-emerald-600 whitespace-nowrap">
                  執行済み
                </th>
                <th className="text-right py-3 px-3 font-medium text-blue-600 whitespace-nowrap">
                  執行予定
                </th>
                <th className="text-right py-3 px-3 font-medium text-yellow-600 whitespace-nowrap">
                  今後見込み
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 whitespace-nowrap">
                  過不足
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    データがありません。費用項目に執行済み額・予定額を入力してください。
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const used = row.executed + row.planned + row.forecast;
                  const variance = row.budget - used;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_COLORS[row.category as keyof typeof CATEGORY_COLORS]}`}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            row.event === "asia"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {row.event === "asia" ? "アジア" : "パラ"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-600 whitespace-nowrap">
                        {formatCurrency(row.budget)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-emerald-700 font-medium whitespace-nowrap">
                        {row.executed > 0 ? formatCurrency(row.executed) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-blue-700 whitespace-nowrap">
                        {row.planned > 0 ? formatCurrency(row.planned) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-yellow-700 whitespace-nowrap">
                        {row.forecast > 0 ? formatCurrency(row.forecast) : "—"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right tabular-nums font-semibold whitespace-nowrap ${
                          variance === 0
                            ? "text-gray-400"
                            : variance > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                        }`}
                      >
                        {variance === 0
                          ? "±¥0"
                          : variance > 0
                            ? `余剰 ${formatCurrency(variance)}`
                            : `不足 ${formatCurrency(Math.abs(variance))}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-sm border-t-2 border-gray-200">
                  <td className="py-3 px-4 text-gray-700" colSpan={2}>
                    合計
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                    {formatCurrency(
                      rows.reduce((s, r) => s + r.budget, 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                    {formatCurrency(rows.reduce((s, r) => s + r.executed, 0))}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-blue-700 whitespace-nowrap">
                    {formatCurrency(rows.reduce((s, r) => s + r.planned, 0))}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-yellow-700 whitespace-nowrap">
                    {formatCurrency(rows.reduce((s, r) => s + r.forecast, 0))}
                  </td>
                  <td
                    className={`py-3 px-4 text-right tabular-nums whitespace-nowrap ${
                      totalVariance >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {totalVariance >= 0
                      ? `余剰 ${formatCurrency(totalVariance)}`
                      : `不足 ${formatCurrency(Math.abs(totalVariance))}`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 注記 */}
      <p className="text-xs text-gray-400">
        ※ 執行済み・予定・見込み額は各費用項目の編集画面から入力できます
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  colorClass,
  valueClass,
  sub,
  prefix = "",
}: {
  label: string;
  value: number;
  colorClass: string;
  valueClass: string;
  sub?: string;
  prefix?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-base font-bold tabular-nums ${valueClass}`}>
        {prefix}
        {formatCurrency(value)}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
