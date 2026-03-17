"use client";

import { useState } from "react";
import {
  Hotel,
  ContractStatus,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_COLORS,
  GROUP_COLORS,
  formatCurrency,
  formatDateRange,
  calcHotelTotals,
} from "@/types";

interface Props {
  hotels: Hotel[];
  onUpdateHotel: (id: string, updates: Partial<Omit<Hotel, "id" | "costItems">>) => void;
}

export default function ContractStatusView({ hotels, onUpdateHotel }: Props) {
  const [filterStatus, setFilterStatus] = useState<ContractStatus | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered =
    filterStatus === "all"
      ? hotels
      : hotels.filter((h) => (h.contractStatus ?? "未着手") === filterStatus);

  // ステータス別カウント
  const statusCounts = CONTRACT_STATUSES.reduce(
    (acc, s) => {
      acc[s] = hotels.filter(
        (h) => (h.contractStatus ?? "未着手") === s
      ).length;
      return acc;
    },
    {} as Record<ContractStatus, number>
  );
  const contractedCount = hotels.filter(
    (h) => h.contractStatus === "契約済"
  ).length;
  const contractedBudget = hotels
    .filter((h) => h.contractStatus === "契約済")
    .reduce((s, h) => s + calcHotelTotals(h).budget, 0);

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">登録施設数</div>
          <div className="text-2xl font-bold text-gray-900">
            {hotels.length}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">施設</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs text-gray-500 mb-1">契約済み</div>
          <div className="text-2xl font-bold text-emerald-700">
            {contractedCount}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {hotels.length > 0
              ? `${Math.round((contractedCount / hotels.length) * 100)}%`
              : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs text-gray-500 mb-1">契約済み予算総額</div>
          <div className="text-base font-bold text-blue-700 tabular-nums">
            {formatCurrency(contractedBudget)}
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-xs text-gray-500 mb-1">未着手・要対応</div>
          <div className="text-2xl font-bold text-red-600">
            {(statusCounts["未着手"] ?? 0) +
              (statusCounts["見積依頼前"] ?? 0) +
              (statusCounts["契約書提示前"] ?? 0)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">施設</div>
        </div>
      </div>

      {/* ステータスフィルター */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filterStatus === "all"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          すべて ({hotels.length})
        </button>
        {CONTRACT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterStatus === s
                ? CONTRACT_STATUS_COLORS[s]
                : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
            }`}
          >
            {s} ({statusCounts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* 施設テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">契約状況一覧</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            ステータス列をクリックして変更できます
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                <th className="text-left py-3 px-4 font-medium text-gray-600 w-20">
                  施設No.
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">
                  施設名
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600 w-36">
                  グループ
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600 w-36">
                  契約状況
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600 w-40 whitespace-nowrap">
                  契約期間
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 w-36 whitespace-nowrap">
                  予算額
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-gray-400 text-sm"
                  >
                    該当する施設がありません
                  </td>
                </tr>
              ) : (
                filtered.map((hotel) => {
                  const status = hotel.contractStatus ?? "未着手";
                  const { budget } = calcHotelTotals(hotel);
                  return (
                    <tr
                      key={hotel.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-gray-400 tabular-nums">
                        {hotel.facilityNo ?? "—"}
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-800">
                        {hotel.name}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {hotel.groups.slice(0, 2).map((g) => (
                            <span
                              key={g}
                              className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${GROUP_COLORS[g]}`}
                            >
                              {g}
                            </span>
                          ))}
                          {hotel.groups.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{hotel.groups.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {editingId === hotel.id ? (
                          <select
                            autoFocus
                            defaultValue={status}
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                            onChange={(e) => {
                              onUpdateHotel(hotel.id, {
                                contractStatus: e.target
                                  .value as ContractStatus,
                              });
                              setEditingId(null);
                            }}
                            onBlur={() => setEditingId(null)}
                          >
                            {CONTRACT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingId(hotel.id)}
                            className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${CONTRACT_STATUS_COLORS[status]}`}
                          >
                            {status}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateRange(
                          hotel.contractStartDate,
                          hotel.contractEndDate
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-gray-700 font-medium whitespace-nowrap">
                        {budget > 0 ? formatCurrency(budget) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
