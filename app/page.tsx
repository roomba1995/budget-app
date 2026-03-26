"use client";

import { useState } from "react";
import Link from "next/link";
import { useHotels } from "@/hooks/useHotels";
import { Hotel, CostItem, Group, GROUPS, GROUP_COLORS } from "@/types";
import SummarySection from "@/components/SummarySection";
import HotelCard from "@/components/HotelCard";
import HotelFormModal from "@/components/HotelFormModal";
import CostItemModal from "@/components/CostItemModal";
import BudgetSummaryView from "@/components/BudgetSummaryView";
import ExecutionDashboard from "@/components/ExecutionDashboard";
import ContractStatusView from "@/components/ContractStatusView";
import BudgetVersionView from "@/components/BudgetVersionView";
import MealCategoryView from "@/components/MealCategoryView";

type Tab = "hotels" | "budget" | "execution" | "contract" | "version" | "meal";

export default function Page() {
  const {
    hotels,
    initialized,
    updateHotel,
    deleteHotel,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    importHotels,
  } = useHotels();

  const handleUpdateHotel = (id: string, updates: Partial<Omit<Hotel, "id" | "costItems">>) => {
    updateHotel(id, updates);
  };

  const [activeTab, setActiveTab] = useState<Tab>("hotels");
  const [filterGroups, setFilterGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);

  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);

  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costModalHotelId, setCostModalHotelId] = useState<string | null>(null);
  const [editingCostItem, setEditingCostItem] = useState<CostItem | null>(null);

  const filteredHotels = hotels.filter((h) => {
    const matchesGroup =
      filterGroups.length === 0 || h.groups.some((g) => filterGroups.includes(g));
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      h.name.toLowerCase().includes(q) ||
      (h.location ?? "").toLowerCase().includes(q) ||
      (h.facilityNo ?? "").toLowerCase().includes(q);
    return matchesGroup && matchesQuery;
  });

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
              onClick={() => window.history.back()}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            >
              ← 戻る
            </button>
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <span>⚙</span>
              <span>管理画面</span>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 border-b border-gray-200 -mb-px overflow-x-auto">
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
            <TabButton
              active={activeTab === "execution"}
              onClick={() => setActiveTab("execution")}
            >
              執行状況
            </TabButton>
            <TabButton
              active={activeTab === "contract"}
              onClick={() => setActiveTab("contract")}
            >
              契約状況
            </TabButton>
            <TabButton
              active={activeTab === "version"}
              onClick={() => setActiveTab("version")}
            >
              バージョン比較
            </TabButton>
            <TabButton
              active={activeTab === "meal"}
              onClick={() => setActiveTab("meal")}
            >
              飲食費詳細
            </TabButton>
          </div>
        </div>

        {/* Search bar (hotels tab only) — sticky, always visible */}
        {activeTab === "hotels" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 border-t border-gray-100 bg-white">
            <div className="relative max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ホテル名・所在地・施設番号で検索..."
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
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
                <p className="text-sm mt-2">
                  <Link href="/admin" className="text-blue-600 hover:underline">管理画面</Link>からExcelアップロードまたは手動追加してください
                </p>
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

        {activeTab === "execution" && <ExecutionDashboard hotels={hotels} />}

        {activeTab === "contract" && (
          <ContractStatusView
            hotels={hotels}
            onUpdateHotel={handleUpdateHotel}
          />
        )}

        {activeTab === "version" && (
          <BudgetVersionView hotels={hotels} onRestoreSnapshot={importHotels} />
        )}

        {activeTab === "meal" && <MealCategoryView hotels={hotels} />}
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
