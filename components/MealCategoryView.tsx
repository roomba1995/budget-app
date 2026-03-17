"use client";

import { useState } from "react";
import {
  Hotel,
  MEAL_SUB_CATEGORIES,
  MealSubCategory,
  EVENT_COLORS,
  formatCurrency,
} from "@/types";

interface Props {
  hotels: Hotel[];
}

const SUB_COLORS: Record<MealSubCategory, string> = {
  通常食: "bg-green-100 text-green-700 border border-green-200",
  "ハラル・ヴィーガン": "bg-purple-100 text-purple-700 border border-purple-200",
  グラブアンドゴー: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  "空港島・仮設厨房": "bg-orange-100 text-orange-700 border border-orange-200",
  厨房機器レンタル: "bg-gray-100 text-gray-600 border border-gray-200",
};

export default function MealCategoryView({ hotels }: Props) {
  const [activeSubCat, setActiveSubCat] =
    useState<MealSubCategory | "all">("all");

  // 飲食費のみ抽出
  const mealItems = hotels.flatMap((h) =>
    h.costItems
      .filter((i) => i.category === "飲食費")
      .map((i) => ({ ...i, hotelName: h.name, hotelId: h.id }))
  );

  const filtered =
    activeSubCat === "all"
      ? mealItems
      : mealItems.filter((i) => i.mealSubCategory === activeSubCat);

  // サブカテゴリ別集計
  const subTotals = MEAL_SUB_CATEGORIES.map((sub) => {
    const items = mealItems.filter((i) => i.mealSubCategory === sub);
    const unclassified =
      sub === "通常食"
        ? mealItems.filter((i) => !i.mealSubCategory)
        : [];
    const allInSub = [...items, ...unclassified];
    return {
      sub,
      count: allInSub.length,
      budget: allInSub.reduce((s, i) => s + i.budgetAmount, 0),
      actual: allInSub.reduce((s, i) => s + i.actualAmount, 0),
    };
  });

  const totalBudget = mealItems.reduce((s, i) => s + i.budgetAmount, 0);
  const totalActual = mealItems.reduce((s, i) => s + i.actualAmount, 0);

  const displayItems =
    activeSubCat === "all"
      ? mealItems
      : activeSubCat === "通常食"
        ? mealItems.filter(
            (i) => i.mealSubCategory === "通常食" || !i.mealSubCategory
          )
        : mealItems.filter((i) => i.mealSubCategory === activeSubCat);

  // アジア/パラ別集計
  const asiaBudget = displayItems
    .filter((i) => i.event === "asia")
    .reduce((s, i) => s + i.budgetAmount, 0);
  const parabudget = displayItems
    .filter((i) => i.event === "para")
    .reduce((s, i) => s + i.budgetAmount, 0);

  return (
    <div className="space-y-4">
      {/* 全体サマリー */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">飲食費 予算総額</div>
          <div className="text-base font-bold text-gray-900 tabular-nums">
            {formatCurrency(totalBudget)}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">飲食費 実績総額</div>
          <div className="text-base font-bold text-gray-700 tabular-nums">
            {formatCurrency(totalActual)}
          </div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-xs text-gray-500 mb-1">アジア大会</div>
          <div className="text-base font-bold text-orange-700 tabular-nums">
            {formatCurrency(
              mealItems
                .filter((i) => i.event === "asia")
                .reduce((s, i) => s + i.budgetAmount, 0)
            )}
          </div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-xs text-gray-500 mb-1">パラ大会</div>
          <div className="text-base font-bold text-sky-700 tabular-nums">
            {formatCurrency(
              mealItems
                .filter((i) => i.event === "para")
                .reduce((s, i) => s + i.budgetAmount, 0)
            )}
          </div>
        </div>
      </div>

      {/* サブカテゴリ別サマリー */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {subTotals.map(({ sub, budget, count }) => (
          <button
            key={sub}
            onClick={() =>
              setActiveSubCat(activeSubCat === sub ? "all" : sub)
            }
            className={`rounded-xl border p-3 text-left transition-all ${
              activeSubCat === sub
                ? SUB_COLORS[sub]
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">{sub}</div>
            <div className="text-sm font-bold text-gray-800 tabular-nums">
              {budget > 0 ? formatCurrency(budget) : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{count}件</div>
          </button>
        ))}
      </div>

      {/* フィルタータブ */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubCat("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            activeSubCat === "all"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          すべて ({mealItems.length}件)
        </button>
        {MEAL_SUB_CATEGORIES.map((sub) => {
          const cnt =
            sub === "通常食"
              ? mealItems.filter(
                  (i) => i.mealSubCategory === sub || !i.mealSubCategory
                ).length
              : mealItems.filter((i) => i.mealSubCategory === sub).length;
          return (
            <button
              key={sub}
              onClick={() => setActiveSubCat(sub)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeSubCat === sub
                  ? SUB_COLORS[sub]
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
              }`}
            >
              {sub} ({cnt})
            </button>
          );
        })}
      </div>

      {/* 明細テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              飲食費 明細
              {activeSubCat !== "all" && (
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full ${SUB_COLORS[activeSubCat]}`}
                >
                  {activeSubCat}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              アジア: {formatCurrency(asiaBudget)} / パラ:{" "}
              {formatCurrency(parabudget)}
            </p>
          </div>
          <div className="text-sm font-semibold text-gray-700 tabular-nums">
            {formatCurrency(
              displayItems.reduce((s, i) => s + i.budgetAmount, 0)
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  ホテル
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">
                  説明
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600 w-32">
                  サブ区分
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600 w-24">
                  大会
                </th>
                <th className="text-right py-3 px-3 font-medium text-gray-600 w-32 whitespace-nowrap">
                  予算額
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 w-32 whitespace-nowrap">
                  実績額
                </th>
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-gray-400 text-sm"
                  >
                    飲食費の項目がありません
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-700 font-medium text-sm">
                      {item.hotelName}
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-sm">
                      {item.description}
                      {item.unitPrice > 0 && item.personCount > 0 && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({item.unitPrice.toLocaleString("ja-JP")}円×
                          {item.personCount}人×{item.nights}泊)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                          item.mealSubCategory
                            ? SUB_COLORS[item.mealSubCategory]
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {item.mealSubCategory ?? "未分類"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${EVENT_COLORS[item.event]}`}
                      >
                        {item.event === "asia" ? "アジア" : "パラ"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-gray-600 whitespace-nowrap">
                      {formatCurrency(item.budgetAmount)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-gray-800 font-medium whitespace-nowrap">
                      {formatCurrency(item.actualAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {displayItems.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                  <td colSpan={4} className="py-3 px-4 text-gray-700">
                    小計
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                    {formatCurrency(
                      displayItems.reduce((s, i) => s + i.budgetAmount, 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-gray-900 whitespace-nowrap">
                    {formatCurrency(
                      displayItems.reduce((s, i) => s + i.actualAmount, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        ※ サブ区分（通常食/ハラル・ヴィーガン等）は各費用項目の編集画面から設定できます
      </p>
    </div>
  );
}
