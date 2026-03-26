"use client";

import { useMemo, useState } from "react";
import { useHotels } from "@/hooks/useHotels";
import { formatCurrency, calcHotelTotals, calcVariance, EVENT_LABELS } from "@/types";
import { Hotel } from "@/types";

function HotelDetailView({ hotel }: { hotel: Hotel | null }) {
  if (!hotel) {
    return <div className="p-6 text-gray-500">右側のホテルを選択して詳細を表示してください。</div>;
  }

  const totals = calcHotelTotals(hotel);
  const variance = calcVariance(totals.budget, totals.actual);

  const costItemsByCategory = hotel.costItems.reduce<Record<string, typeof hotel.costItems>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-2xl font-bold mb-2">{hotel.name}</h2>
      <p className="text-gray-600 mb-2">{hotel.location}</p>
      <p className="text-sm text-gray-500 mb-4">{hotel.notes}</p>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
        <div className="flex flex-wrap gap-4">
          <div>予算: {formatCurrency(totals.budget)}</div>
          <div>実績: {formatCurrency(totals.actual)}</div>
          <div className={variance.className}>{variance.text}</div>
        </div>
      </div>

      {Object.entries(costItemsByCategory).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h3 className="text-lg font-semibold mb-2">{category}</h3>
          {items.length === 0 ? (
            <p className="text-gray-500">該当データなし</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const itemVariance = calcVariance(item.budgetAmount, item.actualAmount);
                return (
                  <div key={item.id} className="p-2 border border-gray-100 rounded">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.description}</span>
                      <span className={`${itemVariance.className}`}>{itemVariance.text}</span>
                    </div>
                    <div className="text-xs text-gray-600">大会: {EVENT_LABELS[item.event]}</div>
                    <div className="text-xs text-gray-600">予算: {formatCurrency(item.budgetAmount)}</div>
                    <div className="text-xs text-gray-600">実績: {formatCurrency(item.actualAmount)}</div>
                    <div className="text-xs text-gray-600">備考: {item.notes}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

    </div>
  );
}

export default function HotelsPage() {
  const { hotels, initialized } = useHotels();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedHotel = useMemo(
    () => (selectedId ? hotels.find((h) => h.id === selectedId) ?? null : null),
    [hotels, selectedId]
  );

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (hotels.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">施設一覧</h1>
        <div className="text-gray-500">施設データがありません。Excelファイルをアップロードしてインポートしてください。</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold">施設一覧</h1>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="space-y-3">
          {hotels.map((hotel) => {
            const totals = calcHotelTotals(hotel);
            const selected = selectedId === hotel.id;
            return (
              <button
                key={hotel.id}
                onClick={() => setSelectedId(hotel.id)}
                className={`block w-full text-left p-4 rounded-lg border transition ${
                  selected
                    ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300"
                    : "bg-white border-gray-200 hover:shadow"}
                `}
              >
                <h2 className="text-lg font-semibold mb-1">{hotel.name}</h2>
                <div className="text-sm text-gray-600 mb-2">{hotel.location}</div>
                <div className="text-sm font-medium">予算: {formatCurrency(totals.budget)}</div>
                <div className="text-sm font-medium">実績: {formatCurrency(totals.actual)}</div>
              </button>
            );
          })}
        </div>

        <div className="xl:col-span-2">
          <HotelDetailView hotel={selectedHotel} />
        </div>
      </div>
    </div>
  );
}
