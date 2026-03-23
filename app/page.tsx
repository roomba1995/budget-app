"use client";

import { ChangeEvent, useState } from "react";
import { useHotels } from "@/hooks/useHotels";
import * as XLSX from "xlsx";
import { parseContractSheet1_1, parseContractSheet1_2, parseAccumulationSheet } from "@/lib/contractParser";
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
    addHotel,
    updateHotel,
    deleteHotel,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    resetToSample,
    importHotels,
  } = useHotels();

  const handleUpdateHotel = (id: string, updates: Partial<Omit<Hotel, "id" | "costItems">>) => {
    updateHotel(id, updates);
  };

  const handleExcelUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setExcelMessage("ファイルが選択されていません。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      if (!arrayBuffer) {
        setExcelMessage("ファイルの読み込みに失敗しました。");
        return;
      }

      try {
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        const parsed: Record<string, any[][]> = {};
        workbook.SheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          parsed[sheetName] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            raw: false,
            defval: "",
          });
        });
        setUploadedExcel(parsed);
        setExcelMessage(`読み込み完了: ${workbook.SheetNames.length} シート (${workbook.SheetNames.join(", ")})`);
      } catch (err) {
        console.error(err);
        setExcelMessage("Excel解析に失敗しました。xlsx フォーマットを確認してください。");
      }
    };
    reader.onerror = () => {
      setExcelMessage("ファイルの読み取り中にエラーが発生しました。");
    };

    reader.readAsArrayBuffer(file);
  };

  const [activeTab, setActiveTab] = useState<Tab>("hotels");
  const [filterGroups, setFilterGroups] = useState<Group[]>([]);
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);

  const [uploadedExcel, setUploadedExcel] = useState<Record<string, any[][]> | null>(null);
  const [excelMessage, setExcelMessage] = useState<string>("");

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

  const parseHotelsFromSheet = (rows: any[][]): Hotel[] => {
    if (!rows || rows.length < 2) return [];
    const header = rows[0].map((h) => String(h || "").trim().toLowerCase());

    const getValue = (row: any[], key: string) => {
      const i = header.findIndex((h) => h === key.toLowerCase());
      return i >= 0 ? row[i] : undefined;
    };

    return rows.slice(1).map((row, idx) => {
      const name = String(getValue(row, "name") || `ホテル ${idx + 1}`);
      const location = String(getValue(row, "location") || "");
      const groupsCell = String(getValue(row, "groups") || "");
      const groups = groupsCell
        .split(/[;,、]/)
        .map((g) => g.trim())
        .filter(Boolean) as Group[];

      return {
        id: String(getValue(row, "id") || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name,
        location,
        groups,
        contractStartDate: String(getValue(row, "contractstartdate") || ""),
        contractEndDate: String(getValue(row, "contractenddate") || ""),
        roomTypes: [],
        costItems: [],
        notes: String(getValue(row, "notes") || ""),
      };
    });
  };

  const handleImportHotels = (sheetName: string) => {
    if (!uploadedExcel || !uploadedExcel[sheetName]) {
      setExcelMessage("インポートするシートが見つかりません。");
      return;
    }

    const sheetData = uploadedExcel[sheetName];
    let hotelsFromSheet: Hotel[] = [];

    // 対象積算シートの判定
    const accumulationSheets = [
      "【251001】アジア選手積算",
      "【251001】パラ選手積算",
      "【250925】アジアファミリー積算",
      "Results【技術役員スポンサーメディア積算】",
    ];

    if (accumulationSheets.includes(sheetName)) {
      try {
        hotelsFromSheet = parseAccumulationSheet(sheetData, sheetName);
        setExcelMessage(`✅ 積算シート(${sheetName})から ${hotelsFromSheet.length} 件の施設データを読み込みました。`);
      } catch (err) {
        console.error("積算シートパーサーエラー:", err);
        setExcelMessage(
          `積算シートの解析に失敗しました: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        return;
      }
    } else if (sheetName.includes("別紙1-1")) {
      // 別紙1-1形式のパーサーを使用
      try {
        hotelsFromSheet = parseContractSheet1_1(sheetData);
        setExcelMessage(
          `✅ 別紙1-1形式で ${hotelsFromSheet.length} 件のホテルデータを読み込みました。`
        );
      } catch (err) {
        console.error("別紙1-1形式パーサーエラー:", err);
        setExcelMessage(
          `別紙1-1形式の解析に失敗しました: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        return;
      }
    } else if (sheetName.includes("別紙1-2")) {
      // 別紙1-2形式のパーサーを使用
      try {
        hotelsFromSheet = parseContractSheet1_2(sheetData);
        setExcelMessage(
          `✅ 別紙1-2形式で ${hotelsFromSheet.length} 件のホテルデータを読み込みました。`
        );
      } catch (err) {
        console.error("別紙1-2形式パーサーエラー:", err);
        setExcelMessage(
          `別紙1-2形式の解析に失敗しました: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        return;
      }
    } else {
      // 従来のシンプル形式（name, location, groups等の列）
      hotelsFromSheet = parseHotelsFromSheet(sheetData);
      if (hotelsFromSheet.length === 0) {
        setExcelMessage(
          "シートに有効なホテルデータがありません。列名は name, location, groups, contractStartDate, contractEndDate を想定しています。"
        );
        return;
      }
      setExcelMessage(`${hotelsFromSheet.length} 件のホテルデータをインポートしました。`);
    }

    if (hotelsFromSheet.length > 0) {
      importHotels(hotelsFromSheet);
    }
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
            <label className="text-sm text-gray-600 px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
              Excelアップロード
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelUpload}
              />
            </label>
            <button
              onClick={() => {
                if (uploadedExcel) {
                  const firstSheet = Object.keys(uploadedExcel)[0];
                  if (firstSheet) handleImportHotels(firstSheet);
                }
              }}
              className="text-sm text-gray-600 px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              disabled={!uploadedExcel}
            >
              先頭シートをホテルにインポート
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {excelMessage && (
          <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-blue-800">
            {excelMessage}
          </div>
        )}

        {uploadedExcel && (
          <section className="rounded-md bg-white border border-gray-200 p-3">
            <h2 className="text-sm font-semibold mb-2">読み込み済みシート</h2>
            <div className="text-sm text-gray-700">
              {Object.keys(uploadedExcel).map((sheetName) => (
                <div key={sheetName} className="mb-1">
                  <button
                    onClick={() => handleImportHotels(sheetName)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 mr-2"
                  >
                    {sheetName} をインポート
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

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

        {activeTab === "execution" && <ExecutionDashboard hotels={hotels} />}

        {activeTab === "contract" && (
          <ContractStatusView
            hotels={hotels}
            onUpdateHotel={handleUpdateHotel}
          />
        )}

        {activeTab === "version" && <BudgetVersionView hotels={hotels} />}

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
