"use client";

import { useState } from "react";
import { Hotel, Group, GROUPS, GROUP_COLORS, RoomType } from "@/types";

interface Props {
  hotel: Hotel | null;
  onSubmit: (data: Omit<Hotel, "id" | "costItems">) => void;
  onClose: () => void;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
}

export default function HotelFormModal({ hotel, onSubmit, onClose }: Props) {
  const [name, setName] = useState(hotel?.name ?? "");
  const [location, setLocation] = useState(hotel?.location ?? "");
  const [groups, setGroups] = useState<Group[]>(hotel?.groups ?? []);
  const [startDate, setStartDate] = useState(hotel?.contractStartDate ?? "");
  const [endDate, setEndDate] = useState(hotel?.contractEndDate ?? "");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(
    hotel?.roomTypes.length
      ? hotel.roomTypes
      : [{ id: genId(), typeName: "", contractQuantity: 0 }]
  );
  const [notes, setNotes] = useState(hotel?.notes ?? "");

  const toggleGroup = (g: Group) => {
    setGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const addRoomType = () => {
    setRoomTypes((prev) => [
      ...prev,
      { id: genId(), typeName: "", contractQuantity: 0 },
    ]);
  };

  const updateRoomType = (
    id: string,
    field: keyof Omit<RoomType, "id">,
    value: string | number
  ) => {
    setRoomTypes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRoomType = (id: string) => {
    setRoomTypes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      location: location.trim(),
      groups,
      contractStartDate: startDate,
      contractEndDate: endDate,
      roomTypes: roomTypes.filter((r) => r.typeName.trim()),
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {hotel ? "ホテル編集" : "ホテル追加"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-5 py-4 space-y-4"
        >
          {/* Hotel name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ホテル名 <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：グランドホテル東京"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              所在地
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：東京都港区赤坂"
            />
          </div>

          {/* Groups */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              使用グループ（複数選択可）
            </label>
            <div className="flex flex-wrap gap-2">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    groups.includes(g)
                      ? GROUP_COLORS[g]
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Contract dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                契約開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                契約終了日
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Room types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">
                客室タイプ
              </label>
              <button
                type="button"
                onClick={addRoomType}
                className="text-xs text-blue-600 hover:underline"
              >
                ＋ タイプ追加
              </button>
            </div>
            <div className="space-y-2">
              {roomTypes.map((r, idx) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    value={r.typeName}
                    onChange={(e) =>
                      updateRoomType(r.id, "typeName", e.target.value)
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="タイプ名（例：スタンダード）"
                  />
                  <input
                    type="number"
                    min="0"
                    value={r.contractQuantity || ""}
                    onChange={(e) =>
                      updateRoomType(
                        r.id,
                        "contractQuantity",
                        Number(e.target.value)
                      )
                    }
                    className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">室</span>
                  {roomTypes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoomType(r.id)}
                      className="text-red-400 hover:text-red-600 text-xl leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="特記事項など"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            form="hotel-form"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            {hotel ? "更新する" : "追加する"}
          </button>
        </div>
      </div>
    </div>
  );
}
