"use client";

import Link from "next/link";
import { useHotels } from "@/hooks/useHotels";
import { formatCurrency, calcHotelTotals } from "@/types";

export default function HotelsPage() {
  const { hotels, initialized } = useHotels();

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
      <h1 className="text-2xl font-bold mb-4">施設一覧</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {hotels.map((hotel) => {
          const totals = calcHotelTotals(hotel);
          return (
            <Link
              key={hotel.id}
              href={`/hotels/${hotel.id}`}
              className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold mb-1">{hotel.name}</h2>
              <div className="text-sm text-gray-600 mb-2">{hotel.location}</div>
              <div className="text-sm font-medium">予算: {formatCurrency(totals.budget)}</div>
              <div className="text-sm font-medium">実績: {formatCurrency(totals.actual)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
