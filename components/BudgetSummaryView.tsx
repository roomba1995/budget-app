"use client";

import { useState } from "react";
import {
  Hotel,
  COST_CATEGORIES,
  CATEGORY_COLORS,
  EVENT_COLORS,
  EVENT_LABELS,
  calcVariance,
  formatCurrency,
} from "@/types";
import GroupAllocationView from "@/components/GroupAllocationView";

interface Props {
  hotels: Hotel[];
  initialSubView?: string;
}

type SubView = "summary" | "allocation";

export default function BudgetSummaryView({ hotels, initialSubView }: Props) {
  const [subView, setSubView] = useState<SubView>(() => {
    if (initialSubView === "allocation") return "allocation";
    return "summary";
  });

  const handleSetSubView = (v: SubView) => {
    setSubView(v);
    const url = new URL(window.location.href);
    url.searchParams.set("view", v);
    window.history.replaceState(null, "", url.toString());
  };
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // 全費目の集計
  const rows = COST_CATEGORIES.map((cat) => {
    const asiaItems = hotels.flatMap((h) =>
      h.costItems
        .filter((i) => i.category === cat && i.event === "asia")
        .map((i) => ({ ...i, hotelName: h.name }))
    );
    const paraItems = hotels.flatMap((h) =>
      h.costItems
        .filter((i) => i.category === cat && i.event === "para")
        .map((i) => ({ ...i, hotelName: h.name }))
    );

    const asiaBudget = asiaItems.reduce((s, i) => s + i.budgetAmount, 0);
    const asiaActual = asiaItems.reduce((s, i) => s + i.actualAmount, 0);
    const paraBudget = paraItems.reduce((s, i) => s + i.budgetAmount, 0);
    const paraActual = paraItems.reduce((s, i) => s + i.actualAmount, 0);

    return {
      cat,
      asiaItems,
      paraItems,
      asiaBudget,
      asiaActual,
      paraBudget,
      paraActual,
      totalBudget: asiaBudget + paraBudget,
      totalActual: asiaActual + paraActual,
    };
  }).filter((r) => r.totalBudget > 0 || r.totalActual > 0);

  const grandBudget = rows.reduce((s, r) => s + r.totalBudget, 0);
  const grandActual = rows.reduce((s, r) => s + r.totalActual, 0);
  const grandAsiaBudget = rows.reduce((s, r) => s + r.asiaBudget, 0);
  const grandAsiaActual = rows.reduce((s, r) => s + r.asiaActual, 0);
  const grandParaBudget = rows.reduce((s, r) => s + r.paraBudget, 0);
  const grandParaActual = rows.reduce((s, r) => s + r.paraActual, 0);

  if (hotels.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* サブナビゲーション */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => handleSetSubView("summary")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subView === "summary"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          費目サマリー
        </button>
        <button
          onClick={() => handleSetSubView("allocation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subView === "allocation"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          グループ別配宿積算
        </button>
      </div>

      {subView === "allocation" && (
        <GroupAllocationView hotels={hotels} />
      )}

      {subView === "summary" && (
      <>
      {/* 大会別サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <EventCard
          label="アジア大会 予算"
          budget={grandAsiaBudget}
          actual={grandAsiaActual}
          colorClass="border-orange-200 bg-orange-50"
        />
        <EventCard
          label="パラ大会 予算"
          budget={grandParaBudget}
          actual={grandParaActual}
          colorClass="border-sky-200 bg-sky-50"
        />
        <EventCard
          label="合計 予算"
          budget={grandBudget}
          actual={grandActual}
          colorClass="border-blue-200 bg-blue-50"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500 mb-1">登録ホテル数</div>
          <div className="text-xl font-bold text-gray-900">
            {hotels.length} ホテル
          </div>
          <div className="text-sm text-gray-400 mt-0.5">
            費目 {rows.length} 種類
          </div>
        </div>
      </div>

      {/* 費目別テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">費目別サマリー</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            行をクリックするとホテル別の内訳を表示します
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600 w-36">
                  費目
                </th>
                {/* Asia */}
                <th className="text-right py-3 px-3 font-medium text-orange-600 whitespace-nowrap">
                  アジア 予算
                </th>
                <th className="text-right py-3 px-3 font-medium text-orange-600 whitespace-nowrap">
                  アジア 実績
                </th>
                <th className="text-right py-3 px-3 font-medium text-orange-600 whitespace-nowrap">
                  アジア 乖離
                </th>
                {/* Para */}
                <th className="text-right py-3 px-3 font-medium text-sky-600 whitespace-nowrap">
                  パラ 予算
                </th>
                <th className="text-right py-3 px-3 font-medium text-sky-600 whitespace-nowrap">
                  パラ 実績
                </th>
                <th className="text-right py-3 px-3 font-medium text-sky-600 whitespace-nowrap">
                  パラ 乖離
                </th>
                {/* Total */}
                <th className="text-right py-3 px-4 font-medium text-gray-700 whitespace-nowrap">
                  合計 実績
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const asiaV = calcVariance(row.asiaBudget, row.asiaActual);
                const paraV = calcVariance(row.paraBudget, row.paraActual);
                const totalV = calcVariance(row.totalBudget, row.totalActual);
                const expanded = expandedCategories.has(row.cat);
                const allItems = [
                  ...row.asiaItems.map((i) => ({ ...i, ev: "asia" as const })),
                  ...row.paraItems.map((i) => ({ ...i, ev: "para" as const })),
                ];

                return (
                  <>
                    {/* Summary row */}
                    <tr
                      key={row.cat}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleCategory(row.cat)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium ${expanded ? "rotate-90" : ""} inline-block transition-transform`}
                          >
                            ▶
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_COLORS[row.cat]}`}
                          >
                            {row.cat}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500 tabular-nums whitespace-nowrap">
                        {row.asiaBudget > 0 ? formatCurrency(row.asiaBudget) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 font-medium tabular-nums whitespace-nowrap">
                        {row.asiaActual > 0 ? formatCurrency(row.asiaActual) : "—"}
                      </td>
                      <td className={`py-3 px-3 text-right tabular-nums whitespace-nowrap ${row.asiaBudget > 0 ? asiaV.className : "text-gray-300"}`}>
                        {row.asiaBudget > 0 ? asiaV.text : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500 tabular-nums whitespace-nowrap">
                        {row.paraBudget > 0 ? formatCurrency(row.paraBudget) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 font-medium tabular-nums whitespace-nowrap">
                        {row.paraActual > 0 ? formatCurrency(row.paraActual) : "—"}
                      </td>
                      <td className={`py-3 px-3 text-right tabular-nums whitespace-nowrap ${row.paraBudget > 0 ? paraV.className : "text-gray-300"}`}>
                        {row.paraBudget > 0 ? paraV.text : "—"}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${totalV.className}`}>
                        {formatCurrency(row.totalActual)}
                      </td>
                    </tr>

                    {/* Detail rows */}
                    {expanded &&
                      allItems.map((item) => {
                        const hasBreakdown =
                          item.unitPrice > 0 &&
                          item.personCount > 0 &&
                          item.nights > 0;
                        const iV = calcVariance(item.budgetAmount, item.actualAmount);
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-gray-50 bg-gray-50/60 text-xs"
                          >
                            <td className="py-2 pl-10 pr-3" colSpan={1}>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-xs ${EVENT_COLORS[item.ev]}`}
                              >
                                {EVENT_LABELS[item.ev]}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-500" colSpan={6}>
                              <span className="font-medium text-gray-600">
                                {item.hotelName}
                              </span>
                              {" — "}
                              {item.description}
                              {hasBreakdown && (
                                <span className="ml-2 text-gray-400">
                                  （{item.unitPrice.toLocaleString("ja-JP")}円 ×{" "}
                                  {item.personCount}人 × {item.nights}泊）
                                </span>
                              )}
                              {item.notes && (
                                <span className="ml-2 text-amber-600">
                                  ※{item.notes}
                                </span>
                              )}
                            </td>
                            <td className={`py-2 px-4 text-right tabular-nums whitespace-nowrap ${iV.className}`}>
                              {formatCurrency(item.actualAmount)}
                            </td>
                          </tr>
                        );
                      })}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-sm border-t-2 border-gray-200">
                <td className="py-3 px-4 text-gray-700">合計</td>
                <td className="py-3 px-3 text-right text-gray-600 tabular-nums whitespace-nowrap">
                  {formatCurrency(grandAsiaBudget)}
                </td>
                <td className="py-3 px-3 text-right text-gray-900 tabular-nums whitespace-nowrap">
                  {formatCurrency(grandAsiaActual)}
                </td>
                <td className={`py-3 px-3 text-right tabular-nums whitespace-nowrap ${calcVariance(grandAsiaBudget, grandAsiaActual).className}`}>
                  {calcVariance(grandAsiaBudget, grandAsiaActual).text}
                </td>
                <td className="py-3 px-3 text-right text-gray-600 tabular-nums whitespace-nowrap">
                  {formatCurrency(grandParaBudget)}
                </td>
                <td className="py-3 px-3 text-right text-gray-900 tabular-nums whitespace-nowrap">
                  {formatCurrency(grandParaActual)}
                </td>
                <td className={`py-3 px-3 text-right tabular-nums whitespace-nowrap ${calcVariance(grandParaBudget, grandParaActual).className}`}>
                  {calcVariance(grandParaBudget, grandParaActual).text}
                </td>
                <td className={`py-3 px-4 text-right tabular-nums whitespace-nowrap ${calcVariance(grandBudget, grandActual).className}`}>
                  {formatCurrency(grandActual)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function EventCard({
  label,
  budget,
  actual,
  colorClass,
}: {
  label: string;
  budget: number;
  actual: number;
  colorClass: string;
}) {
  const v = calcVariance(budget, actual);
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-base font-bold text-gray-700 tabular-nums">
        {formatCurrency(budget)}
      </div>
      <div className="text-sm text-gray-500 mt-0.5 tabular-nums">
        実績 {formatCurrency(actual)}
      </div>
      <div className={`text-xs mt-1 font-medium ${v.className}`}>{v.text}</div>
    </div>
  );
}
