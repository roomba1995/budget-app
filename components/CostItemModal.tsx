"use client";

import { useState, useEffect } from "react";
import {
  CostItem,
  CostCategory,
  COST_CATEGORIES,
  CATEGORY_COLORS,
  GameEvent,
  EVENTS,
  EVENT_LABELS,
  EVENT_COLORS,
  MealSubCategory,
  MEAL_SUB_CATEGORIES,
  calcLineTotal,
  formatCurrency,
} from "@/types";

interface Props {
  item: CostItem | null;
  onSubmit: (data: Omit<CostItem, "id">) => void;
  onClose: () => void;
}

export default function CostItemModal({ item, onSubmit, onClose }: Props) {
  const [category, setCategory] = useState<CostCategory>(
    item?.category ?? "客室確保費"
  );
  const [event, setEvent] = useState<GameEvent>(item?.event ?? "asia");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unitPrice, setUnitPrice] = useState(
    item?.unitPrice ? String(item.unitPrice) : ""
  );
  const [personCount, setPersonCount] = useState(
    item?.personCount ? String(item.personCount) : ""
  );
  const [nights, setNights] = useState(
    item?.nights ? String(item.nights) : ""
  );
  const [budgetAmount, setBudgetAmount] = useState(
    item?.budgetAmount != null ? String(item.budgetAmount) : ""
  );
  const [actualAmount, setActualAmount] = useState(
    item?.actualAmount != null ? String(item.actualAmount) : ""
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [executedAmount, setExecutedAmount] = useState(
    item?.executedAmount ? String(item.executedAmount) : ""
  );
  const [plannedAmount, setPlannedAmount] = useState(
    item?.plannedAmount ? String(item.plannedAmount) : ""
  );
  const [forecastAmount, setForecastAmount] = useState(
    item?.forecastAmount ? String(item.forecastAmount) : ""
  );
  const [mealSubCategory, setMealSubCategory] = useState<MealSubCategory | "">(
    item?.mealSubCategory ?? ""
  );

  // 単価×人数×泊数から実績額を自動計算
  const computed = calcLineTotal(
    Number(unitPrice) || 0,
    Number(personCount) || 0,
    Number(nights) || 0
  );

  useEffect(() => {
    if (computed !== null) {
      setActualAmount(String(computed));
    }
  }, [unitPrice, personCount, nights]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit({
      category,
      description: description.trim(),
      event,
      unitPrice: Number(unitPrice) || 0,
      personCount: Number(personCount) || 0,
      nights: Number(nights) || 0,
      budgetAmount: Number(budgetAmount) || 0,
      actualAmount: Number(actualAmount) || 0,
      executedAmount: Number(executedAmount) || 0,
      plannedAmount: Number(plannedAmount) || 0,
      forecastAmount: Number(forecastAmount) || 0,
      mealSubCategory: mealSubCategory || undefined,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {item ? "費用編集" : "費用追加"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-5 py-4 space-y-4"
        >
          {/* Event */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              対象大会
            </label>
            <div className="flex gap-2">
              {EVENTS.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => setEvent(ev)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    event === ev
                      ? EVENT_COLORS[ev]
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {EVENT_LABELS[ev]}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              費目
            </label>
            <div className="flex flex-wrap gap-2">
              {COST_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    category === cat
                      ? CATEGORY_COLORS[cat]
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：スタンダードルーム（選手団）"
            />
          </div>

          {/* Unit breakdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              単価 × 人数 × 泊数（任意）
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">単価（円）</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">人数</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={personCount}
                  onChange={(e) => setPersonCount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">泊数</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>
            {computed !== null && (
              <div className="mt-1.5 text-xs text-right text-blue-600">
                計算値: {formatCurrency(computed)}（実績額に自動反映）
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                予算額（円）
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right tabular-nums"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                実績額（円）
                {computed !== null && (
                  <span className="ml-1 text-blue-500">※自動計算</span>
                )}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right tabular-nums"
                placeholder="0"
              />
            </div>
          </div>

          {/* Preview variance */}
          {(budgetAmount || actualAmount) && (
            <div className="text-xs text-right text-gray-500 -mt-2">
              {(() => {
                const b = Number(budgetAmount) || 0;
                const a = Number(actualAmount) || 0;
                const diff = a - b;
                if (diff === 0) return <span className="text-gray-400">乖離なし</span>;
                if (diff > 0)
                  return (
                    <span className="text-red-600 font-medium">
                      ▲¥{diff.toLocaleString("ja-JP")} 超過
                    </span>
                  );
                return (
                  <span className="text-emerald-600 font-medium">
                    △¥{Math.abs(diff).toLocaleString("ja-JP")} 余剰
                  </span>
                );
              })()}
            </div>
          )}

          {/* 執行状況 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              執行状況（任意）
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">執行済み額（円）</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={executedAmount}
                  onChange={(e) => setExecutedAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">執行予定額（円）</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={plannedAmount}
                  onChange={(e) => setPlannedAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">今後の見込み（円）</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={forecastAmount}
                  onChange={(e) => setForecastAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-right tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* 飲食費サブカテゴリ */}
          {category === "飲食費" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                飲食費 サブ区分（任意）
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMealSubCategory("")}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    !mealSubCategory
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  未分類
                </button>
                {MEAL_SUB_CATEGORIES.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setMealSubCategory(sub)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      mealSubCategory === sub
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="特記事項（例：人数増加のため超過見込み）"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            {item ? "更新する" : "追加する"}
          </button>
        </div>
      </div>
    </div>
  );
}
