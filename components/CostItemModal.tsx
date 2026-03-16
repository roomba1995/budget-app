"use client";

import { useState } from "react";
import { CostItem, CostCategory, COST_CATEGORIES, CATEGORY_COLORS } from "@/types";

interface Props {
  item: CostItem | null;
  onSubmit: (data: Omit<CostItem, "id">) => void;
  onClose: () => void;
}

export default function CostItemModal({ item, onSubmit, onClose }: Props) {
  const [category, setCategory] = useState<CostCategory>(
    item?.category ?? "客室料金"
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [budgetAmount, setBudgetAmount] = useState(
    item?.budgetAmount != null ? String(item.budgetAmount) : ""
  );
  const [actualAmount, setActualAmount] = useState(
    item?.actualAmount != null ? String(item.actualAmount) : ""
  );
  const [notes, setNotes] = useState(item?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit({
      category,
      description: description.trim(),
      budgetAmount: Number(budgetAmount) || 0,
      actualAmount: Number(actualAmount) || 0,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[92vh]">
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
              placeholder="例：スタンダードルーム（15泊×80室）"
            />
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
