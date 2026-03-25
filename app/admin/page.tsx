"use client";

import { useState } from "react";
import Link from "next/link";
import { useHotels, MergeAlert } from "@/hooks/useHotels";
import { Hotel, GROUP_COLORS, CONTRACT_STATUS_COLORS, formatDateRange } from "@/types";
import HotelFormModal from "@/components/HotelFormModal";
import AdminHotelImportModal from "@/components/AdminHotelImportModal";

export default function AdminPage() {
  const {
    hotels,
    initialized,
    addHotel,
    updateHotel,
    deleteHotel,
    mergeImportHotels,
  } = useHotels();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHotels = searchQuery
    ? hotels.filter(
        (h) =>
          h.name.includes(searchQuery) ||
          (h.facilityNo && h.facilityNo.includes(searchQuery)) ||
          h.location.includes(searchQuery)
      )
    : hotels;

  const handleAddHotel = () => {
    setEditingHotel(null);
    setHotelModalOpen(true);
  };

  const handleEditHotel = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setHotelModalOpen(true);
  };

  const handleDeleteHotel = (id: string, name: string) => {
    if (confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) {
      deleteHotel(id);
    }
  };

  const handleHotelFormSubmit = (data: Omit<Hotel, "id" | "costItems">) => {
    if (editingHotel) {
      updateHotel(editingHotel.id, data);
    } else {
      addHotel(data);
    }
    setHotelModalOpen(false);
  };

  const handleImport = (incoming: Hotel[]): MergeAlert[] => {
    const result = mergeImportHotels(incoming);
    return result.alerts;
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              ← メイン画面
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
              <p className="text-xs text-gray-500 mt-0.5">施設データの管理・インポート</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>↑</span> Excelアップロード
            </button>
            <button
              onClick={handleAddHotel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 施設を追加
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* 施設管理セクション */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">施設一覧</h2>
              <p className="text-xs text-gray-500 mt-0.5">全{hotels.length}件</p>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="施設名・施設番号・所在地で検索..."
              className="w-64 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {hotels.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-gray-400 text-sm mb-4">施設データがありません</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Excelからアップロード
                </button>
                <button
                  onClick={handleAddHotel}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  手動で追加
                </button>
              </div>
            </div>
          ) : filteredHotels.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              「{searchQuery}」に一致する施設は見つかりませんでした
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-24">施設番号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">施設名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">所在地</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">グループ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">契約状況</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">契約期間</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHotels.map((hotel) => (
                    <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {hotel.facilityNo || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {hotel.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {hotel.location || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {hotel.groups.length === 0 ? (
                            <span className="text-gray-400 text-xs">—</span>
                          ) : (
                            hotel.groups.slice(0, 3).map((g) => (
                              <span
                                key={g}
                                className={`px-1.5 py-0.5 rounded text-xs border ${GROUP_COLORS[g]}`}
                              >
                                {g}
                              </span>
                            ))
                          )}
                          {hotel.groups.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">
                              +{hotel.groups.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hotel.contractStatus ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs border ${CONTRACT_STATUS_COLORS[hotel.contractStatus]}`}
                          >
                            {hotel.contractStatus}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateRange(hotel.contractStartDate, hotel.contractEndDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditHotel(hotel)}
                            className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                            className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* モーダル */}
      {importModalOpen && (
        <AdminHotelImportModal
          existingHotels={hotels}
          onImport={handleImport}
          onClose={() => setImportModalOpen(false)}
        />
      )}

      {hotelModalOpen && (
        <HotelFormModal
          hotel={editingHotel}
          onSubmit={handleHotelFormSubmit}
          onClose={() => setHotelModalOpen(false)}
        />
      )}
    </div>
  );
}
