"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useHotels, MergeAlert } from "@/hooks/useHotels";
import { Hotel, GROUP_COLORS, CONTRACT_STATUS_COLORS, formatDateRange } from "@/types";
import HotelFormModal from "@/components/HotelFormModal";
import AdminHotelImportModal from "@/components/AdminHotelImportModal";
import { COL_CONFIG_KEY, ColConfig } from "@/components/GroupAllocationView";

// All column definitions — IDs must exactly match COL_DEFS in GroupAllocationView.tsx
const DEFAULT_COL_LABELS: { id: string; label: string; group: string }[] = [
  { id: "area",              label: "エリア",               group: "基本情報" },
  { id: "municipality",     label: "市町村郡",              group: "基本情報" },
  { id: "facilityNo",       label: "施設番号",              group: "基本情報" },
  { id: "location",         label: "所在地",               group: "基本情報" },
  { id: "totalRooms",       label: "保有客室数",            group: "客室数" },
  { id: "totalCapacity",    label: "収容人数(保有)",        group: "客室数" },
  { id: "offeredRooms",     label: "提供客室数",            group: "客室数" },
  { id: "offeredCapacity",  label: "収容人数(提供)",        group: "客室数" },
  { id: "utilizedRooms",    label: "利用想定客室数",        group: "客室数" },
  { id: "avgOccupancy",     label: "平均宿泊人数",          group: "客室数" },
  { id: "totalFunctionRooms",   label: "ファンクション保有室数", group: "ファンクション" },
  { id: "offeredFunctionRooms", label: "ファンクション提供室数", group: "ファンクション" },
  { id: "functionRoomEstimate", label: "ファンクション利用想定", group: "ファンクション" },
  { id: "hasGym",       label: "ジム",              group: "設備" },
  { id: "hasSauna",     label: "サウナ",            group: "設備" },
  { id: "hasLaundry",   label: "コインランドリー",   group: "設備" },
  { id: "boardingArea", label: "乗降場",             group: "設備" },
  { id: "exclusiveUse", label: "貸切想定",           group: "設備" },
  { id: "tenantCount",  label: "テナント数",         group: "設備" },
  { id: "mealDifficulty",    label: "食事提供難易度",  group: "食事" },
  { id: "mealProvider",      label: "食事提供主体",   group: "食事" },
  { id: "breakfastSeats",    label: "朝食会場座席数", group: "食事" },
  { id: "breakfastUnitPrice", label: "朝食単価",     group: "食事" },
  { id: "halalSupport",      label: "ハラル支援",    group: "食事" },
  { id: "assignedSport",        label: "配宿競技",   group: "配宿情報" },
  { id: "assignedVenue",        label: "会場",       group: "配宿情報" },
  { id: "assignedPersonCount",  label: "人数",       group: "配宿情報" },
  { id: "facilityPersonCount",  label: "施設別人数", group: "配宿情報" },
  { id: "estimateStatus",      label: "見積取得状況",        group: "料金" },
  { id: "normalRoomUnitPrice", label: "見積単価（通常）",    group: "料金" },
  { id: "halalRoomUnitPrice",  label: "見積単価（ハラル）",  group: "料金" },
  { id: "pricePerRoom",        label: "1室単価（税込）",     group: "料金" },
  { id: "minRoomPrice",        label: "単価幅最低（税抜）",  group: "料金" },
  { id: "maxRoomPrice",        label: "単価幅最高（税抜）",  group: "料金" },
  { id: "priceFluctuation",    label: "変動有無",            group: "料金" },
  { id: "bathTax",             label: "入湯税/宿泊税",       group: "料金" },
  { id: "cancellationPolicy",  label: "キャンセルポリシー",  group: "料金" },
  { id: "ci",              label: "CI",                      group: "日程・集計" },
  { id: "co",              label: "CO",                      group: "日程・集計" },
  { id: "nights",          label: "確保泊数",                group: "日程・集計" },
  { id: "dailyRoomBudget", label: "1日あたり客室費（予算）", group: "日程・集計" },
  { id: "roomBudgetTotal", label: "客室総計（予算）",        group: "日程・集計" },
  { id: "roomActualTotal", label: "客室総計（実績）",        group: "日程・集計" },
  { id: "funcBudgetTotal", label: "ファンクション総計（予算）", group: "日程・集計" },
];

/** RFC 4180 compliant CSV line parser — handles quoted fields with commas/newlines */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function loadColConfig(): ColConfig[] {
  try {
    const s = localStorage.getItem(COL_CONFIG_KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return DEFAULT_COL_LABELS.map((c, i) => ({ id: c.id, label: c.label, order: i }));
}

function exportColConfigCsv() {
  const cfg = loadColConfig();
  const byId = new Map(cfg.map((c) => [c.id, c]));
  const rows = DEFAULT_COL_LABELS.map((def, i) => {
    const ov = byId.get(def.id);
    return [def.id, ov?.label ?? def.label, String(ov?.order ?? i), ov?.group ?? def.group];
  }).sort((a, b) => Number(a[2]) - Number(b[2]));
  const header = ["id", "label", "order", "group"];
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "column-config.csv";
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [colImportMsg, setColImportMsg] = useState<string | null>(null);
  const [colPreview, setColPreview] = useState<ColConfig[]>(() => {
    try { const s = localStorage.getItem(COL_CONFIG_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const colFileRef = useRef<HTMLInputElement>(null);

  const handleColImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        // skip header line; use RFC 4180 parser for quoted fields
        const cfgs: ColConfig[] = lines.slice(1).map((line, idx) => {
          const cols = parseCSVLine(line);
          const rawId = cols[0]?.trim();
          const label = cols[1]?.trim() ?? "";
          const id = rawId || `custom_${label.replace(/\s+/g, "_") || idx}`;
          const order = cols[2] !== undefined && cols[2].trim() !== "" ? Number(cols[2]) : idx;
          const group = cols[3]?.trim() || undefined;
          return { id, label, order, ...(group ? { group } : {}) };
        }).filter((c) => c.label);
        localStorage.setItem(COL_CONFIG_KEY, JSON.stringify(cfgs));
        window.dispatchEvent(new StorageEvent("storage", { key: COL_CONFIG_KEY }));
        setColPreview(cfgs);
        setColImportMsg(`✓ ${cfgs.length}列の設定を保存しました。`);
      } catch {
        setColImportMsg("⚠ CSVの読み込みに失敗しました。フォーマットを確認してください。");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 列定義管理セクション */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">グループ別配宿積算 — 列定義管理</h2>
            <p className="text-xs text-gray-500 mt-0.5">列の表示名・並び順をCSVでエクスポートし、Excelで編集後にインポートできます</p>
          </div>
          <div className="px-5 py-4 flex flex-wrap items-center gap-3">
            <button
              onClick={exportColConfigCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ↓ CSV ダウンロード
            </button>
            <button
              onClick={() => colFileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              ↑ CSV インポート
            </button>
            <input ref={colFileRef} type="file" accept=".csv" className="hidden" onChange={handleColImport} />
            <button
              onClick={() => { localStorage.removeItem(COL_CONFIG_KEY); setColPreview([]); window.dispatchEvent(new StorageEvent("storage", { key: COL_CONFIG_KEY })); setColImportMsg("✓ デフォルト設定にリセットしました。"); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              リセット
            </button>
            {colImportMsg && (
              <span className={`text-xs ${colImportMsg.startsWith("⚠") ? "text-red-500" : "text-green-600"}`}>
                {colImportMsg}
              </span>
            )}
          </div>
          <div className="px-5 pb-1">
            <p className="text-xs text-gray-400">
              CSVの列: <code className="bg-gray-100 px-1 rounded">id</code>（空欄の場合は自動生成）、
              <code className="bg-gray-100 px-1 rounded">label</code>（表示名・変更可）、
              <code className="bg-gray-100 px-1 rounded">order</code>（並び順、小さいほど左）、
              <code className="bg-gray-100 px-1 rounded">group</code>（列設定パネルのグループ名・変更可）
            </p>
          </div>
          {/* 現在保存されている列設定プレビュー */}
          {colPreview.length > 0 && (() => {
            const knownIds = new Set(DEFAULT_COL_LABELS.map((d) => d.id));
            const normLabel = (l: string) => l.replace(/\n/g, "").trim();
            const knownLabels = new Set(DEFAULT_COL_LABELS.map((d) => normLabel(d.label)));
            const badRows = colPreview.filter((c) => !knownIds.has(c.id) && !knownLabels.has(normLabel(c.label)));
            return (
              <div className="px-5 pb-4 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500">現在保存されている列設定（{colPreview.length}列）</span>
                  {badRows.length > 0 && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      ⚠ {badRows.length}行のIDが不明（ラベルでフォールバック適用）
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-8">順</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">id</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">label</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...colPreview].sort((a, b) => a.order - b.order).map((c) => {
                        const isUnknown = !knownIds.has(c.id) && !knownLabels.has(normLabel(c.label));
                        return (
                          <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isUnknown ? "bg-amber-50" : ""}`}>
                            <td className="px-3 py-1.5 text-gray-400 tabular-nums">{c.order}</td>
                            <td className={`px-3 py-1.5 font-mono ${isUnknown ? "text-amber-600" : "text-gray-500"}`}>{c.id}</td>
                            <td className="px-3 py-1.5 text-gray-800">{c.label}</td>
                            <td className="px-3 py-1.5 text-gray-500">{c.group ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

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
