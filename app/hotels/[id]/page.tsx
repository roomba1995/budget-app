"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHotels } from "@/hooks/useHotels";
import { calcHotelTotals, formatCurrency, calcVariance, CATEGORY_COLORS, EVENT_COLORS, EVENT_LABELS } from "@/types";
import { Hotel } from "@/types";

export default function HotelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { hotels, initialized } = useHotels();

  const hotel = useMemo(() => hotels.find((h) => h.id === id), [hotels, id]);

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!hotel) {
    return (
      <div className="min-h-screen p-6">
        <div className="mb-4 text-lg text-red-600">ホテルが見つかりませんでした。</div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => router.push("/hotels")}
        >
          施設一覧に戻る
        </button>
      </div>
    );
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
    <div className="min-h-screen p-6 bg-gray-50">
      <button
        onClick={() => router.push("/hotels")}
        className="mb-4 text-sm text-blue-600 underline"
      >
        ← 施設一覧へ戻る
      </button>
      <h1 className="text-2xl font-bold mb-2">{hotel.name}</h1>
      <p className="text-gray-600 mb-2">{hotel.location}</p>
      <p className="text-sm text-gray-500 mb-4">{hotel.notes}</p>

      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex gap-4">
          <div>予算: {formatCurrency(totals.budget)}</div>
          <div>実績: {formatCurrency(totals.actual)}</div>
          <div className={variance.className}>{variance.text}</div>
        </div>
      </div>

      {Object.entries(costItemsByCategory).map(([category, items]) => (
        <div key={category} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">{category}</h2>
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
