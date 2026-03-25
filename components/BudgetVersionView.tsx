"use client";

import { useState, useEffect } from "react";
import {
  Hotel,
  HotelSnapshot,
  BudgetVersion,
  BudgetVersionEntry,
  COST_CATEGORIES,
  CATEGORY_COLORS,
  formatCurrency,
} from "@/types";

const VERSION_STORAGE_KEY = "budget-versions-v1";
const SNAPSHOT_STORAGE_KEY = "hotel-snapshots-v1";

interface Props {
  hotels: Hotel[];
  onRestoreSnapshot: (hotels: Hotel[]) => void;
}

export default function BudgetVersionView({ hotels, onRestoreSnapshot }: Props) {
  const [versions, setVersions] = useState<BudgetVersion[]>([]);
  const [compareA, setCompareA] = useState<string>("current");
  const [compareB, setCompareB] = useState<string>("");
  const [newVersionName, setNewVersionName] = useState("");
  const [saving, setSaving] = useState(false);

  const [snapshots, setSnapshots] = useState<HotelSnapshot[]>([]);
  const [newSnapshotName, setNewSnapshotName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VERSION_STORAGE_KEY);
      if (stored) setVersions(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    try {
      const stored = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (stored) setSnapshots(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const saveVersions = (v: BudgetVersion[]) => {
    setVersions(v);
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(v));
  };

  const handleSaveVersion = () => {
    const name = newVersionName.trim();
    if (!name) return;
    setSaving(true);
    const entries: BudgetVersionEntry[] = hotels.flatMap((h) =>
      h.costItems.map((i) => ({
        hotelId: h.id,
        hotelName: h.name,
        category: i.category,
        event: i.event,
        budgetAmount: i.budgetAmount,
        actualAmount: i.actualAmount,
      }))
    );
    const newVersion: BudgetVersion = {
      id: `v-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      entries,
    };
    saveVersions([...versions, newVersion]);
    setNewVersionName("");
    setCompareB(newVersion.id);
    setSaving(false);
  };

  const saveSnapshots = (s: HotelSnapshot[]) => {
    setSnapshots(s);
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(s));
  };

  const handleSaveSnapshot = () => {
    const name = newSnapshotName.trim();
    if (!name) return;
    const snap: HotelSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      hotels: JSON.parse(JSON.stringify(hotels)),
    };
    saveSnapshots([...snapshots, snap]);
    setNewSnapshotName("");
  };

  const handleRestoreSnapshot = (snap: HotelSnapshot) => {
    if (!confirm(`「${snap.name}」に復元します。現在のデータは上書きされます。よろしいですか？`)) return;
    onRestoreSnapshot(snap.hotels);
  };

  const handleDeleteSnapshot = (id: string) => {
    if (!confirm("このバックアップを削除しますか？")) return;
    saveSnapshots(snapshots.filter((s) => s.id !== id));
  };

  const handleDeleteVersion = (id: string) => {
    if (!confirm("このバージョンを削除しますか？")) return;
    const next = versions.filter((v) => v.id !== id);
    saveVersions(next);
    if (compareA === id) setCompareA("current");
    if (compareB === id) setCompareB("");
  };

  // バージョンのデータを取得
  const getVersionEntries = (versionId: string): BudgetVersionEntry[] => {
    if (versionId === "current") {
      return hotels.flatMap((h) =>
        h.costItems.map((i) => ({
          hotelId: h.id,
          hotelName: h.name,
          category: i.category,
          event: i.event,
          budgetAmount: i.budgetAmount,
          actualAmount: i.actualAmount,
        }))
      );
    }
    return versions.find((v) => v.id === versionId)?.entries ?? [];
  };

  const getVersionLabel = (versionId: string) => {
    if (versionId === "current") return "現在";
    return versions.find((v) => v.id === versionId)?.name ?? versionId;
  };

  // 比較テーブルを構築
  const buildComparisonRows = () => {
    const entriesA = getVersionEntries(compareA);
    const entriesB = compareB ? getVersionEntries(compareB) : null;

    return COST_CATEGORIES.map((cat) => {
      const aBudget = entriesA
        .filter((e) => e.category === cat)
        .reduce((s, e) => s + e.budgetAmount, 0);
      const aActual = entriesA
        .filter((e) => e.category === cat)
        .reduce((s, e) => s + e.actualAmount, 0);
      const bBudget = entriesB
        ? entriesB
            .filter((e) => e.category === cat)
            .reduce((s, e) => s + e.budgetAmount, 0)
        : null;
      const bActual = entriesB
        ? entriesB
            .filter((e) => e.category === cat)
            .reduce((s, e) => s + e.actualAmount, 0)
        : null;

      return {
        cat,
        aBudget,
        aActual,
        bBudget,
        bActual,
        diffBudget: bBudget != null ? aBudget - bBudget : null,
        diffActual: bActual != null ? aActual - bActual : null,
      };
    }).filter(
      (r) => r.aBudget > 0 || r.aActual > 0 || (r.bBudget ?? 0) > 0
    );
  };

  const rows = buildComparisonRows();
  const totalA_budget = rows.reduce((s, r) => s + r.aBudget, 0);
  const totalA_actual = rows.reduce((s, r) => s + r.aActual, 0);
  const totalB_budget = rows.reduce((s, r) => s + (r.bBudget ?? 0), 0);
  const totalB_actual = rows.reduce((s, r) => s + (r.bActual ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* データバックアップ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          データバックアップ
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          全ホテルデータ（客室・費用・契約情報を含む）のスナップショットを保存し、後から復元できます。
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSnapshotName}
            onChange={(e) => setNewSnapshotName(e.target.value)}
            placeholder="例: 3月25日版、査定前バックアップ"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onKeyDown={(e) => e.key === "Enter" && handleSaveSnapshot()}
          />
          <button
            onClick={handleSaveSnapshot}
            disabled={!newSnapshotName.trim()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            バックアップ保存
          </button>
        </div>
        {snapshots.length > 0 ? (
          <div className="space-y-2">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-100"
              >
                <div>
                  <span className="font-medium text-sm text-gray-800">{snap.name}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(snap.createdAt).toLocaleDateString("ja-JP", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    ({snap.hotels.length}件)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-100 transition-colors font-medium"
                  >
                    復元
                  </button>
                  <button
                    onClick={() => handleDeleteSnapshot(snap.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">
            まだバックアップがありません
          </p>
        )}
      </div>

      {/* バージョン保存 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          現在の状態をバージョンとして保存
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            placeholder="例: 10/17版、査定額版、第3回財政見通し"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleSaveVersion()}
          />
          <button
            onClick={handleSaveVersion}
            disabled={!newVersionName.trim() || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            保存
          </button>
        </div>
      </div>

      {/* 保存済みバージョン一覧 */}
      {versions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            保存済みバージョン
          </h2>
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div>
                  <span className="font-medium text-sm text-gray-800">
                    {v.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(v.createdAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteVersion(v.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 比較設定 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          バージョン比較
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">比較元:</span>
            <select
              value={compareA}
              onChange={(e) => setCompareA(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="current">現在</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <span className="text-gray-400 text-lg">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">比較先:</span>
            <select
              value={compareB}
              onChange={(e) => setCompareB(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">なし</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 比較テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            費目別比較: {getVersionLabel(compareA)}
            {compareB && ` vs ${getVersionLabel(compareB)}`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                <th className="text-left py-3 px-4 font-medium text-gray-600 w-40">
                  費目
                </th>
                <th className="text-right py-3 px-3 font-medium text-blue-600 whitespace-nowrap">
                  {getVersionLabel(compareA)} 予算
                </th>
                <th className="text-right py-3 px-3 font-medium text-blue-600 whitespace-nowrap">
                  {getVersionLabel(compareA)} 実績
                </th>
                {compareB && (
                  <>
                    <th className="text-right py-3 px-3 font-medium text-purple-600 whitespace-nowrap">
                      {getVersionLabel(compareB)} 予算
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-purple-600 whitespace-nowrap">
                      {getVersionLabel(compareB)} 実績
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 whitespace-nowrap">
                      差額（予算）
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.cat}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_COLORS[row.cat]}`}
                    >
                      {row.cat}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-gray-600 whitespace-nowrap">
                    {formatCurrency(row.aBudget)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-gray-800 font-medium whitespace-nowrap">
                    {formatCurrency(row.aActual)}
                  </td>
                  {compareB && (
                    <>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-600 whitespace-nowrap">
                        {row.bBudget != null ? formatCurrency(row.bBudget) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-800 font-medium whitespace-nowrap">
                        {row.bActual != null ? formatCurrency(row.bActual) : "—"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right tabular-nums font-semibold whitespace-nowrap ${
                          row.diffBudget == null || row.diffBudget === 0
                            ? "text-gray-400"
                            : row.diffBudget > 0
                              ? "text-red-600"
                              : "text-emerald-600"
                        }`}
                      >
                        {row.diffBudget == null
                          ? "—"
                          : row.diffBudget === 0
                            ? "±¥0"
                            : row.diffBudget > 0
                              ? `+${formatCurrency(row.diffBudget)}`
                              : `−${formatCurrency(Math.abs(row.diffBudget))}`}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                <td className="py-3 px-4 text-gray-700">合計</td>
                <td className="py-3 px-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                  {formatCurrency(totalA_budget)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-gray-900 whitespace-nowrap">
                  {formatCurrency(totalA_actual)}
                </td>
                {compareB && (
                  <>
                    <td className="py-3 px-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                      {formatCurrency(totalB_budget)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-gray-900 whitespace-nowrap">
                      {formatCurrency(totalB_actual)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right tabular-nums whitespace-nowrap ${
                        totalA_budget - totalB_budget > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {totalA_budget - totalB_budget === 0
                        ? "±¥0"
                        : totalA_budget - totalB_budget > 0
                          ? `+${formatCurrency(totalA_budget - totalB_budget)}`
                          : `−${formatCurrency(Math.abs(totalA_budget - totalB_budget))}`}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {versions.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          上のフォームからバージョンを保存すると比較できます。例：「10/17版」「査定額」など
        </p>
      )}
    </div>
  );
}
