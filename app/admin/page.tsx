"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useHotels, MergeAlert } from "@/hooks/useHotels";
import { Hotel, GROUP_COLORS, CONTRACT_STATUS_COLORS, formatDateRange } from "@/types";
import HotelFormModal from "@/components/HotelFormModal";
import AdminHotelImportModal from "@/components/AdminHotelImportModal";
import { COL_CONFIG_KEY, ColConfig, LABEL_TO_ID, COL_DEF_IDS } from "@/components/GroupAllocationView";

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

/** Normalize a label for robust matching (mirrors GroupAllocationView.normLabel) */
const norm = (l: string) => l
  .replace(/[\r\n]/g, "")
  .replace(/（/g, "(").replace(/）/g, ")")
  .replace(/\u3000/g, " ")
  .trim();

// Build normalized-key lookup from LABEL_TO_ID (handles full↔half-width parens)
const NORM_LABEL_TO_ID: Record<string, string> = {};
for (const [k, v] of Object.entries(LABEL_TO_ID)) {
  NORM_LABEL_TO_ID[norm(k)] = v;
}

/** Resolve a config entry's id to the canonical COL_DEF id.
 *  Priority: 1) exact COL_DEF ID, 2) LABEL_TO_ID lookup (normalized) */
function resolveColId(id: string, label: string): string {
  if (COL_DEF_IDS.has(id)) return id;
  const nl = norm(label);
  const byLabel = NORM_LABEL_TO_ID[nl];
  if (byLabel && COL_DEF_IDS.has(byLabel)) return byLabel;
  return id; // unknown – keep as-is (custom label)
}

function loadColConfig(): ColConfig[] {
  try {
    const s = localStorage.getItem(COL_CONFIG_KEY);
    if (s) {
      const raw: ColConfig[] = JSON.parse(s);
      return raw.map((c) => ({ ...c, id: resolveColId(c.id, c.label) }));
    }
  } catch { /* ignore */ }
  return []; // nothing stored yet
}

function exportColConfigCsv() {
  const cfg = loadColConfig();
  if (!cfg.length) {
    alert("列設定がインポートされていません。先にCSVをインポートしてください。");
    return;
  }
  const sorted = [...cfg].sort((a, b) => a.order - b.order);
  const header = ["id", "label", "order", "group"];
  const csv = [header, ...sorted.map((c) => [c.id, c.label, String(c.order), c.group ?? ""])]
    .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "column-config.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── ParseResultTable ──────────────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString("ja-JP");
  return String(v);
}

interface SectionSummary {
  rooms: number;
  dailyCost: number | null;
  dailyCostTax: number | null;
  totalCost: number | null;
  totalCostTax: number | null;
}

function extractSection(s: unknown): SectionSummary | null {
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const rooms = Array.isArray(o.rooms) ? o.rooms.length : 0;
  return {
    rooms,
    dailyCost: typeof o.dailyCost === "number" ? o.dailyCost : null,
    dailyCostTax: typeof o.dailyCostTax === "number" ? o.dailyCostTax : null,
    totalCost: typeof o.totalCost === "number" ? o.totalCost : null,
    totalCostTax: typeof o.totalCostTax === "number" ? o.totalCostTax : null,
  };
}

function SectionCells({ s }: { s: SectionSummary | null }) {
  if (!s) return <><td className="px-3 py-1.5 text-gray-300 text-center" colSpan={5}>—</td></>;
  const missing = s.totalCost == null && s.totalCostTax == null;
  const cls = missing ? "text-amber-700 bg-amber-50" : "text-gray-600";
  return (
    <>
      <td className={`px-3 py-1.5 tabular-nums text-right ${cls}`}>{s.rooms}</td>
      <td className={`px-3 py-1.5 tabular-nums text-right ${cls}`}>{fmt(s.dailyCost)}</td>
      <td className={`px-3 py-1.5 tabular-nums text-right ${cls}`}>{fmt(s.dailyCostTax)}</td>
      <td className={`px-3 py-1.5 tabular-nums text-right ${missing ? "font-semibold text-amber-700 bg-amber-50" : cls}`}>{fmt(s.totalCost)}</td>
      <td className={`px-3 py-1.5 tabular-nums text-right ${missing ? "font-semibold text-amber-700 bg-amber-50" : cls}`}>{fmt(s.totalCostTax)}</td>
    </>
  );
}

function ParseResultTable({
  rcDb,
  mrDb,
}: {
  rcDb: Record<string, unknown> | null;
  mrDb: Record<string, unknown> | null;
}) {
  const colHeaders = (
    <tr className="border-b border-gray-100">
      <th className="px-3 py-2 text-left font-medium text-gray-500 w-16">No.</th>
      <th className="px-3 py-2 text-left font-medium text-gray-500">施設名</th>
      <th className="px-3 py-2 text-left font-medium text-gray-500 w-12">区分</th>
      <th className="px-3 py-2 text-right font-medium text-gray-500">部屋数</th>
      <th className="px-3 py-2 text-right font-medium text-gray-500">1日あたり</th>
      <th className="px-3 py-2 text-right font-medium text-gray-500">1日(税込)</th>
      <th className="px-3 py-2 text-right font-medium text-gray-500">合計</th>
      <th className="px-3 py-2 text-right font-medium text-gray-500">合計(税込)</th>
    </tr>
  );

  function renderDb(db: Record<string, unknown> | null) {
    if (!db) return null;
    const entries = Object.entries(db).sort(([a], [b]) => Number(a) - Number(b));
    return entries.flatMap(([no, entry]) => {
      if (!entry || typeof entry !== "object") return [];
      const e = entry as Record<string, unknown>;
      const name = typeof e.hotelName === "string" ? e.hotelName : "";
      const asia = extractSection(e.asia);
      const para = extractSection(e.para);
      const rows = [];
      if (asia) {
        const missing = asia.totalCost == null && asia.totalCostTax == null;
        rows.push(
          <tr key={`${no}-asia`} className={`border-b border-gray-50 hover:bg-gray-50 ${missing ? "bg-amber-50/40" : ""}`}>
            <td className="px-3 py-1.5 font-mono text-xs text-gray-400">{no}</td>
            <td className="px-3 py-1.5 text-gray-800 text-xs">{name}</td>
            <td className="px-3 py-1.5 text-xs text-blue-600 font-medium">アジア</td>
            <SectionCells s={asia} />
          </tr>
        );
      }
      if (para) {
        const missing = para.totalCost == null && para.totalCostTax == null;
        rows.push(
          <tr key={`${no}-para`} className={`border-b border-gray-50 hover:bg-gray-50 ${missing ? "bg-amber-50/40" : ""}`}>
            <td className="px-3 py-1.5 font-mono text-xs text-gray-400">{no}</td>
            <td className="px-3 py-1.5 text-gray-800 text-xs">{name}</td>
            <td className="px-3 py-1.5 text-xs text-purple-600 font-medium">パラ</td>
            <SectionCells s={para} />
          </tr>
        );
      }
      return rows;
    });
  }

  return (
    <div className="px-5 pb-4 space-y-4">
      {rcDb && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1.5">
            別紙1-1 パース結果（{Object.keys(rcDb).length}施設）
            <span className="ml-2 font-normal text-amber-600">※ 橙色ハイライト = 合計金額が取得できていない行</span>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">{colHeaders}</thead>
              <tbody>{renderDb(rcDb)}</tbody>
            </table>
          </div>
        </div>
      )}
      {mrDb && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1.5">
            別紙1-2 パース結果（{Object.keys(mrDb).length}施設）
          </div>
          <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">{colHeaders}</thead>
              <tbody>{renderDb(mrDb)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
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
  const [colPreview, setColPreview] = useState<ColConfig[]>([]);
  const colFileRef = useRef<HTMLInputElement>(null);

  // ── Room-charges Excel upload ──────────────────────────────────────────────
  const [rcMsg, setRcMsg] = useState<string | null>(null);
  const [rcParsing, setRcParsing] = useState(false);
  const [rcCount, setRcCount] = useState<number>(0);
  const [rcErrors, setRcErrors] = useState<string[]>([]);
  const [mrErrors, setMrErrors] = useState<string[]>([]);
  const [rcDetails, setRcDetails] = useState<Record<string, unknown> | null>(null);
  const [mrDetails, setMrDetails] = useState<Record<string, unknown> | null>(null);
  const rcFileRef = useRef<HTMLInputElement>(null);

  // ── Meal-costs Excel upload ────────────────────────────────────────────────
  const [mcMsg, setMcMsg] = useState<string | null>(null);
  const [mcParsing, setMcParsing] = useState(false);
  const [mcCount, setMcCount] = useState<number>(0);
  const mcFileRef = useRef<HTMLInputElement>(null);

  // Load localStorage after mount only — prevents SSR/hydration mismatch
  useEffect(() => {
    try {
      const s = localStorage.getItem(COL_CONFIG_KEY);
      if (s) setColPreview(JSON.parse(s));
    } catch { /* ignore */ }
    try {
      const s1 = localStorage.getItem("room-charges-v2-uploaded");
      if (s1) setRcCount(Object.keys(JSON.parse(s1)).length);
    } catch { /* ignore */ }
    try {
      const s2 = localStorage.getItem("meal-costs-v1-uploaded");
      if (s2) setMcCount(Object.keys(JSON.parse(s2)).length);
    } catch { /* ignore */ }
  }, []);

  const handleRcUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRcParsing(true);
    setRcMsg(null);
    setRcErrors([]);
    setMrErrors([]);
    setRcDetails(null);
    setMrDetails(null);
    try {
      const [
        { parseRoomChargesFromFile, ROOM_CHARGES_STORAGE_KEY },
        { parseMeetingRoomsFromFile, MEETING_ROOMS_STORAGE_KEY },
      ] = await Promise.all([
        import("@/lib/parseRoomCharges"),
        import("@/lib/parseMeetingRooms"),
      ]);
      const [rcResult, mrResult] = await Promise.all([
        parseRoomChargesFromFile(file),
        parseMeetingRoomsFromFile(file),
      ]);
      localStorage.setItem(ROOM_CHARGES_STORAGE_KEY, JSON.stringify(rcResult.db));
      localStorage.setItem(MEETING_ROOMS_STORAGE_KEY, JSON.stringify(mrResult.db));
      window.dispatchEvent(new StorageEvent("storage", { key: ROOM_CHARGES_STORAGE_KEY, newValue: JSON.stringify(rcResult.db) }));
      window.dispatchEvent(new StorageEvent("storage", { key: MEETING_ROOMS_STORAGE_KEY, newValue: JSON.stringify(mrResult.db) }));
      setRcCount(rcResult.count);
      setRcErrors(rcResult.errors);
      setMrErrors(mrResult.errors);
      setRcDetails(rcResult.db);
      setMrDetails(mrResult.db);
      const errs = rcResult.errors.length + mrResult.errors.length;
      setRcMsg(`✓ 別紙1-1: ${rcResult.count}施設、別紙1-2: ${mrResult.count}施設のデータを保存しました。${errs > 0 ? `（エラー${errs}件）` : ""}`);
    } catch (err) {
      setRcMsg(`⚠ エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRcParsing(false);
      e.target.value = "";
    }
  };

  const handleMcUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMcParsing(true);
    setMcMsg(null);
    try {
      const { parseMealCostsFromFile, MEAL_COSTS_STORAGE_KEY } = await import("@/lib/parseMealCosts");
      const result = await parseMealCostsFromFile(file);
      localStorage.setItem(MEAL_COSTS_STORAGE_KEY, JSON.stringify(result.db));
      window.dispatchEvent(new StorageEvent("storage", { key: MEAL_COSTS_STORAGE_KEY, newValue: JSON.stringify(result.db) }));
      setMcCount(result.count);
      setMcMsg(`✓ 別紙2: ${result.count}施設のデータを保存しました。${result.errors.length > 0 ? `（エラー${result.errors.length}件）` : ""}`);
    } catch (err) {
      setMcMsg(`⚠ エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setMcParsing(false);
      e.target.value = "";
    }
  };

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
          // Always resolve to canonical COL_DEF id so export/apply work correctly
          const id = resolveColId(rawId || "", label) || `custom_${label.replace(/\s+/g, "_") || idx}`;
          const order = cols[2] !== undefined && cols[2].trim() !== "" ? Number(cols[2]) : idx;
          const group = cols[3]?.trim() || undefined;
          return { id, label, order, ...(group ? { group } : {}) };
        }).filter((c) => c.label);
        localStorage.setItem(COL_CONFIG_KEY, JSON.stringify(cfgs));
        // Clear hidden-cols so all imported columns are visible when budget page loads
        localStorage.removeItem("groupAllocation-hiddenCols-v1");
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
            <button
              onClick={() => window.history.back()}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              ← 戻る
            </button>
            <span className="text-gray-200 select-none">|</span>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              メイン画面
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
            // Flag entries whose ID can't be matched to any renderable COL_DEF
            const badRows = colPreview.filter((c) => !COL_DEF_IDS.has(c.id));
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
                        const isUnknown = !COL_DEF_IDS.has(c.id);
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

        {/* 客室料金データ ── Excelアップロード */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">客室料金データ — Excelアップロード</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              「宿泊費積算根拠.xlsm」をアップロードすると、各ホテルの別紙1-1シートから客室料金を自動取得します
            </p>
          </div>
          <div className="px-5 py-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => rcFileRef.current?.click()}
              disabled={rcParsing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {rcParsing ? "解析中..." : "↑ Excelアップロード (.xlsm / .xlsx)"}
            </button>
            <input
              ref={rcFileRef}
              type="file"
              accept=".xlsm,.xlsx,.xls"
              className="hidden"
              onChange={handleRcUpload}
            />
            {rcCount > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                現在: {rcCount}施設分のデータ保存済み
              </span>
            )}
            {rcMsg && (
              <span className={`text-xs ${rcMsg.startsWith("⚠") ? "text-red-500" : "text-green-600"}`}>
                {rcMsg}
              </span>
            )}
          </div>
          <div className="px-5 pb-4">
            <p className="text-xs text-gray-400">
              アップロードしたデータはブラウザのローカルストレージに保存されます。各ホテルの詳細ページで客室料金積算として表示されます。
            </p>
          </div>

          {/* エラー詳細 */}
          {(rcErrors.length > 0 || mrErrors.length > 0) && (
            <div className="px-5 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-red-700 mb-2">パースエラー詳細（{rcErrors.length + mrErrors.length}件）</div>
                <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs text-red-800">
                  {rcErrors.map((e, i) => <div key={`rc${i}`} className="py-0.5 border-b border-red-100">【別紙1-1】{e}</div>)}
                  {mrErrors.map((e, i) => <div key={`mr${i}`} className="py-0.5 border-b border-red-100">【別紙1-2】{e}</div>)}
                </div>
              </div>
            </div>
          )}

          {/* 別紙1-1 / 1-2 パース結果一覧 */}
          {(rcDetails || mrDetails) && (
            <ParseResultTable rcDb={rcDetails} mrDb={mrDetails} />
          )}
        </div>

        {/* 飲食費データ ── Excelアップロード */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">飲食費データ — Excelアップロード（一括）</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              複数施設の別紙2シートを含むExcelファイルをアップロードすると、飲食費データを一括取得します。個別ファイルはホテル詳細画面からアップロードできます。
            </p>
          </div>
          <div className="px-5 py-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => mcFileRef.current?.click()}
              disabled={mcParsing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {mcParsing ? "解析中..." : "↑ Excelアップロード (.xlsm / .xlsx)"}
            </button>
            <input
              ref={mcFileRef}
              type="file"
              accept=".xlsm,.xlsx,.xls"
              className="hidden"
              onChange={handleMcUpload}
            />
            {mcCount > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                現在: {mcCount}施設分のデータ保存済み
              </span>
            )}
            {mcMsg && (
              <span className={`text-xs ${mcMsg.startsWith("⚠") ? "text-red-500" : "text-green-600"}`}>
                {mcMsg}
              </span>
            )}
          </div>
          <div className="px-5 pb-4">
            <p className="text-xs text-gray-400">
              アップロードしたデータはブラウザのローカルストレージに保存されます。各ホテルの詳細ページ「飲食費」タブで表示されます。
            </p>
          </div>
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
