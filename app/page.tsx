"use client";

import { useState } from "react";
import { useHotels } from "@/hooks/useHotels";
import { Hotel, CostItem, Group, GROUPS, GROUP_COLORS } from "@/types";
import SummarySection from "@/components/SummarySection";
import HotelCard from "@/components/HotelCard";
import HotelFormModal from "@/components/HotelFormModal";
import CostItemModal from "@/components/CostItemModal";
import BudgetSummaryView from "@/components/BudgetSummaryView";

type Tab = "hotels" | "budget";

export default function Page() {
  const {
    hotels,
    initialized,
    addHotel,
    updateHotel,
    deleteHotel,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    resetToSample,
  } = useHotels();

  const [activeTab, setActiveTab] = useState<Tab>("hotels");
  const [filterGroups, setFilterGroups] = useState<Group[]>([]);
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);

  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);

  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costModalHotelId, setCostModalHotelId] = useState<string | null>(null);
  const [editingCostItem, setEditingCostItem] = useState<CostItem | null>(null);

  const filteredHotels =
    filterGroups.length === 0
      ? hotels
      : hotels.filter((h) => h.groups.some((g) => filterGroups.includes(g)));

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
      if (expandedHotelId === id) setExpandedHotelId(null);
    }
  };

  const handleHotelFormSubmit = (data: Omit<Hotel, "id" | "costItems">) => {
    if (editingHotel) {
      updateHotel(editingHotel.id, data);
    } else {
      const newId = addHotel(data);
      setExpandedHotelId(newId);
    }
    setHotelModalOpen(false);
  };

  const handleAddCostItem = (hotelId: string) => {
    setCostModalHotelId(hotelId);
    setEditingCostItem(null);
    setCostModalOpen(true);
  };

  const handleEditCostItem = (hotelId: string, item: CostItem) => {
    setCostModalHotelId(hotelId);
    setEditingCostItem(item);
    setCostModalOpen(true);
  };

  const handleDeleteCostItem = (
    hotelId: string,
    itemId: string,
    desc: string
  ) => {
    if (confirm(`「${desc}」を削除しますか？`)) {
      deleteCostItem(hotelId, itemId);
    }
  };

  const handleCostItemSubmit = (data: Omit<CostItem, "id">) => {
    if (!costModalHotelId) return;
    if (editingCostItem) {
      updateCostItem(costModalHotelId, editingCostItem.id, data);
    } else {
      addCostItem(costModalHotelId, data);
    }
    setCostModalOpen(false);
  };

  const toggleGroup = (g: Group) => {
    setFilterGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ホテル予算管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              契約ホテルの費用予算・実績を一元管理
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={resetToSample}
              className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              サンプルリセット
            </button>
            {activeTab === "hotels" && (
              <button
                onClick={handleAddHotel}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-base font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <span className="text-base leading-none">＋</span>
                <span>ホテル追加</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 border-b border-gray-200 -mb-px">
            <TabButton
              active={activeTab === "hotels"}
              onClick={() => setActiveTab("hotels")}
            >
              ホテル管理
            </TabButton>
            <TabButton
              active={activeTab === "budget"}
              onClick={() => setActiveTab("budget")}
            >
              予算サマリー
            </TabButton>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {activeTab === "hotels" && (
          <>
            {/* Summary */}
            <SummarySection hotels={hotels} />

            {/* Group Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">絞り込み:</span>
              <button
                onClick={() => setFilterGroups([])}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  filterGroups.length === 0
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                すべて
              </button>
              {GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGroup(g)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    filterGroups.includes(g)
                      ? GROUP_COLORS[g]
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {g}
                </button>
              ))}
              <span className="text-sm text-gray-400 ml-1">
                {filteredHotels.length}件
              </span>
            </div>

            {/* Hotel List */}
            {filteredHotels.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-4">🏨</div>
                <p className="text-base">ホテルが登録されていません</p>
                <button
                  onClick={handleAddHotel}
                  className="mt-4 text-blue-600 hover:underline text-base"
                >
                  ホテルを追加する
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    expanded={expandedHotelId === hotel.id}
                    onToggle={() =>
                      setExpandedHotelId(
                        expandedHotelId === hotel.id ? null : hotel.id
                      )
                    }
                    onEdit={() => handleEditHotel(hotel)}
                    onDelete={() => handleDeleteHotel(hotel.id, hotel.name)}
                    onAddCostItem={() => handleAddCostItem(hotel.id)}
                    onEditCostItem={(item) => handleEditCostItem(hotel.id, item)}
                    onDeleteCostItem={(itemId, desc) =>
                      handleDeleteCostItem(hotel.id, itemId, desc)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "budget" && <BudgetSummaryView hotels={hotels} />}
      </main>

      {hotelModalOpen && (
        <HotelFormModal
          hotel={editingHotel}
          onSubmit={handleHotelFormSubmit}
          onClose={() => setHotelModalOpen(false)}
        />
      )}

      {costModalOpen && costModalHotelId && (
        <CostItemModal
          item={editingCostItem}
          onSubmit={handleCostItemSubmit}
          onClose={() => setCostModalOpen(false)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}
