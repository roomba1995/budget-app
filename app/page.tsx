"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useHotels } from "@/hooks/useHotels";
import { Hotel, CostItem, Group, GROUPS, GROUP_COLORS } from "@/types";
import SummarySection from "@/components/SummarySection";
import type { RoomChargesDB } from "@/lib/parseRoomCharges";
import type { MeetingRoomsDB } from "@/lib/parseMeetingRooms";
import type { AllocationDB } from "@/lib/parseBudgetAllocation";
import { ALLOCATION_STORAGE_KEY } from "@/lib/parseBudgetAllocation";
import HotelCard from "@/components/HotelCard";
import HotelFormModal from "@/components/HotelFormModal";
import CostItemModal from "@/components/CostItemModal";
import BudgetSummaryView from "@/components/BudgetSummaryView";
import BudgetOverallView from "@/components/BudgetOverallView";
import ExecutionDashboard from "@/components/ExecutionDashboard";
import ContractStatusView from "@/components/ContractStatusView";
import BudgetVersionView from "@/components/BudgetVersionView";
import MealCategoryView from "@/components/MealCategoryView";

type Mode = "budget" | "current";
type Tab = "hotels" | "overall" | "budget" | "execution" | "contract" | "version" | "meal";

// ストレージキーをモードに応じて切り替え
const STORAGE_KEYS = {
  budget: {
    hotels: "hotel-budget-data-v2",
    alloc: ALLOCATION_STORAGE_KEY,
    rc: "room-charges-v2-uploaded",
    mr: "meeting-rooms-v1-uploaded",
  },
  current: {
    hotels: "current-hotels-v1",
    alloc: "current-alloc-v1",
    rc: "current-rc-v1",
    mr: "current-mr-v1",
  },
} as const;

// ── Landing page ─────────────────────────────────────────────────────────────
function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ホテル予算管理</h1>
        <p className="text-gray-500">表示するデータの種類を選択してください</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <Link
          href="/?mode=budget"
          className="flex-1 bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-700">予算金額</h2>
          <p className="text-sm text-gray-500">積算シートに基づく予算額。<br/>基本的に変更されない確定値。</p>
          <div className="mt-4 text-xs text-gray-400">総予算額: ¥28,929,665,120</div>
        </Link>
        <Link
          href="/?mode=current"
          className="flex-1 bg-white border-2 border-green-200 hover:border-green-400 rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-700">現状金額</h2>
          <p className="text-sm text-gray-500">現在の最新状況を反映した金額。<br/>随時更新可能。</p>
          <div className="mt-4 text-xs text-gray-400">最新データをアップロードして管理</div>
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  const [mode, setMode] = useState<Mode | "landing" | null>(null);

  // Read mode from URL on mount (client-only, static export)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as Mode | null;
    if (m === "budget" || m === "current") {
      setMode(m);
    } else {
      setMode("landing");
    }
  }, []);

  // null = hydrating, show nothing to prevent flash
  if (mode === null) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-lg">読み込み中...</div>
    </div>
  );

  if (mode === "landing") return <LandingPage />;

  return <AppPage mode={mode} />;
}

function AppPage({ mode }: { mode: Mode }) {
  const keys = STORAGE_KEYS[mode];
  const modeLabel = mode === "budget" ? "予算金額" : "現状金額";
  const modeColor = mode === "budget" ? "text-blue-600" : "text-green-600";
  const modeBg = mode === "budget" ? "bg-blue-50" : "bg-green-50";

  const {
    hotels,
    initialized,
    updateHotel,
    deleteHotel,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    importHotels,
  } = useHotels(keys.hotels);

  const handleUpdateHotel = (id: string, updates: Partial<Omit<Hotel, "id" | "costItems">>) => {
    updateHotel(id, updates);
  };

  const VALID_TABS: Tab[] = ["hotels", "overall", "budget", "execution", "contract", "version", "meal"];
  const [activeTab, setActiveTab] = useState<Tab>("hotels");
  const [initialSubView, setInitialSubView] = useState<string | undefined>(undefined);

  // Sync tab/view state with URL so history.back() restores the correct tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as Tab | null;
    if (t && VALID_TABS.includes(t)) setActiveTab(t);
    const v = params.get("view");
    if (v) setInitialSubView(v);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetActiveTab = (tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    if (tab !== "budget") url.searchParams.delete("view");
    window.history.replaceState(null, "", url.toString());
  };

  // Excel DB for room charges and meeting rooms
  const [roomChargeDb, setRoomChargeDb] = useState<RoomChargesDB | null>(null);
  const [meetingRoomDb, setMeetingRoomDb] = useState<MeetingRoomsDB | null>(null);
  const [allocationDb, setAllocationDb] = useState<AllocationDB | null>(null);

  useEffect(() => {
    const loadDb = async () => {
      try {
        const rcRaw = localStorage.getItem(keys.rc);
        const mrRaw = localStorage.getItem(keys.mr);
        const allocRaw = localStorage.getItem(keys.alloc);
        if (rcRaw) {
          setRoomChargeDb(JSON.parse(rcRaw));
        } else if (mode === "budget") {
          const res = await fetch(`/budget-app/room-charges.json`);
          if (res.ok) setRoomChargeDb(await res.json());
        }
        if (mrRaw) {
          setMeetingRoomDb(JSON.parse(mrRaw));
        } else if (mode === "budget") {
          const res = await fetch(`/budget-app/meeting-rooms.json`);
          if (res.ok) setMeetingRoomDb(await res.json());
        }
        if (allocRaw) setAllocationDb(JSON.parse(allocRaw));
      } catch { /* ignore */ }
    };
    loadDb();
    const onStorage = (e: StorageEvent) => {
      if (e.key === keys.rc && e.newValue) setRoomChargeDb(JSON.parse(e.newValue));
      if (e.key === keys.mr && e.newValue) setMeetingRoomDb(JSON.parse(e.newValue));
      if (e.key === keys.alloc && e.newValue) setAllocationDb(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
            <p className="text-sm mt-0.5">
              <span className={`font-medium ${modeColor}`}>{modeLabel}</span>
              <span className="text-gray-400 ml-2">— 契約ホテルの費用を一元管理</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            >
              ← トップ
            </Link>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${modeBg} ${modeColor} border-current/20`}>
              {modeLabel}
            </span>
            <Link
              href={`/admin?mode=${mode}`}
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
              onClick={() => handleSetActiveTab("hotels")}
            >
              ホテル管理
            </TabButton>
            <TabButton
              active={activeTab === "overall"}
              onClick={() => handleSetActiveTab("overall")}
            >
              全体予算管理
            </TabButton>
            <TabButton
              active={activeTab === "budget"}
              onClick={() => handleSetActiveTab("budget")}
            >
              宿泊確保費積算
            </TabButton>
            <TabButton
              active={activeTab === "execution"}
              onClick={() => handleSetActiveTab("execution")}
            >
              執行状況
            </TabButton>
            <TabButton
              active={activeTab === "contract"}
              onClick={() => handleSetActiveTab("contract")}
            >
              契約状況
            </TabButton>
            <TabButton
              active={activeTab === "version"}
              onClick={() => handleSetActiveTab("version")}
            >
              バージョン比較
            </TabButton>
            <TabButton
              active={activeTab === "meal"}
              onClick={() => handleSetActiveTab("meal")}
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
            <SummarySection hotels={hotels} roomChargeDb={roomChargeDb} meetingRoomDb={meetingRoomDb} overallBudgetTotal={28_929_665_120} />

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
                    mode={mode}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "overall" && <BudgetOverallView onNavigate={handleSetActiveTab} />}

        {activeTab === "budget" && <BudgetSummaryView hotels={hotels} initialSubView={initialSubView} roomChargeDb={roomChargeDb} meetingRoomDb={meetingRoomDb} allocationDb={allocationDb} />}

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
