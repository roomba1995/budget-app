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
  const [facilityNo, setFacilityNo] = useState(hotel?.facilityNo ?? "");
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
  const [totalRooms, setTotalRooms] = useState<number | "">(hotel?.totalRooms ?? "");
  const [offeredRooms, setOfferedRooms] = useState<number | "">(hotel?.offeredRooms ?? "");
  const [totalFunctionRooms, setTotalFunctionRooms] = useState<number | "">(hotel?.totalFunctionRooms ?? "");
  const [offeredFunctionRooms, setOfferedFunctionRooms] = useState<number | "">(hotel?.offeredFunctionRooms ?? "");
  const [notes, setNotes] = useState(hotel?.notes ?? "");
  const [detailOpen, setDetailOpen] = useState(false);
  // 詳細情報
  const [area, setArea] = useState(hotel?.area ?? "");
  const [municipality, setMunicipality] = useState(hotel?.municipality ?? "");
  const [totalCapacity, setTotalCapacity] = useState<number | "">(hotel?.totalCapacity ?? "");
  const [offeredCapacity, setOfferedCapacity] = useState<number | "">(hotel?.offeredCapacity ?? "");
  const [functionRoomEstimate, setFunctionRoomEstimate] = useState<number | "">(hotel?.functionRoomEstimate ?? "");
  const [hasGym, setHasGym] = useState(hotel?.hasGym ?? false);
  const [hasSauna, setHasSauna] = useState(hotel?.hasSauna ?? false);
  const [hasLaundry, setHasLaundry] = useState(hotel?.hasLaundry ?? false);
  const [boardingArea, setBoardingArea] = useState(hotel?.boardingArea ?? "");
  const [exclusiveUse, setExclusiveUse] = useState(hotel?.exclusiveUse ?? "");
  const [mealDifficulty, setMealDifficulty] = useState(hotel?.mealDifficulty ?? "");
  const [mealProvider, setMealProvider] = useState(hotel?.mealProvider ?? "");
  const [breakfastSeats, setBreakfastSeats] = useState<number | "">(hotel?.breakfastSeats ?? "");
  const [assignedSport, setAssignedSport] = useState(hotel?.assignedSport ?? "");
  const [assignedVenue, setAssignedVenue] = useState(hotel?.assignedVenue ?? "");
  const [assignedPersonCount, setAssignedPersonCount] = useState<number | "">(hotel?.assignedPersonCount ?? "");
  const [facilityPersonCount, setFacilityPersonCount] = useState<number | "">(hotel?.facilityPersonCount ?? "");
  const [utilizedRooms, setUtilizedRooms] = useState<number | "">(hotel?.utilizedRooms ?? "");
  const [avgOccupancy, setAvgOccupancy] = useState<number | "">(hotel?.avgOccupancy ?? "");
  const [pricePerRoom, setPricePerRoom] = useState<number | "">(hotel?.pricePerRoom ?? "");
  const [minRoomPrice, setMinRoomPrice] = useState<number | "">(hotel?.minRoomPrice ?? "");
  const [maxRoomPrice, setMaxRoomPrice] = useState<number | "">(hotel?.maxRoomPrice ?? "");
  const [priceFluctuation, setPriceFluctuation] = useState(hotel?.priceFluctuation ?? "");
  const [estimateStatus, setEstimateStatus] = useState(hotel?.estimateStatus ?? "");
  const [breakfastUnitPrice, setBreakfastUnitPrice] = useState<number | "">(hotel?.breakfastUnitPrice ?? "");
  const [normalRoomUnitPrice, setNormalRoomUnitPrice] = useState<number | "">(hotel?.normalRoomUnitPrice ?? "");
  const [halalRoomUnitPrice, setHalalRoomUnitPrice] = useState<number | "">(hotel?.halalRoomUnitPrice ?? "");
  const [halalSupport, setHalalSupport] = useState(hotel?.halalSupport ?? "");
  const [bathTax, setBathTax] = useState<number | "">(hotel?.bathTax ?? "");
  const [tenantCount, setTenantCount] = useState<number | "">(hotel?.tenantCount ?? "");
  const [cancellationPolicy, setCancellationPolicy] = useState(hotel?.cancellationPolicy ?? "");

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
      facilityNo: facilityNo.trim() || undefined,
      name: name.trim(),
      location: location.trim(),
      groups,
      contractStartDate: startDate,
      contractEndDate: endDate,
      roomTypes: roomTypes.filter((r) => r.typeName.trim()),
      notes: notes.trim(),
      totalRooms: totalRooms !== "" ? Number(totalRooms) : undefined,
      totalCapacity: totalCapacity !== "" ? Number(totalCapacity) : undefined,
      offeredRooms: offeredRooms !== "" ? Number(offeredRooms) : undefined,
      offeredCapacity: offeredCapacity !== "" ? Number(offeredCapacity) : undefined,
      totalFunctionRooms: totalFunctionRooms !== "" ? Number(totalFunctionRooms) : undefined,
      offeredFunctionRooms: offeredFunctionRooms !== "" ? Number(offeredFunctionRooms) : undefined,
      functionRoomEstimate: functionRoomEstimate !== "" ? Number(functionRoomEstimate) : undefined,
      area: area.trim() || undefined,
      municipality: municipality.trim() || undefined,
      hasGym: hasGym || undefined,
      hasSauna: hasSauna || undefined,
      hasLaundry: hasLaundry || undefined,
      boardingArea: boardingArea.trim() || undefined,
      exclusiveUse: exclusiveUse.trim() || undefined,
      mealDifficulty: mealDifficulty.trim() || undefined,
      mealProvider: mealProvider.trim() || undefined,
      breakfastSeats: breakfastSeats !== "" ? Number(breakfastSeats) : undefined,
      assignedSport: assignedSport.trim() || undefined,
      assignedVenue: assignedVenue.trim() || undefined,
      assignedPersonCount: assignedPersonCount !== "" ? Number(assignedPersonCount) : undefined,
      facilityPersonCount: facilityPersonCount !== "" ? Number(facilityPersonCount) : undefined,
      utilizedRooms: utilizedRooms !== "" ? Number(utilizedRooms) : undefined,
      avgOccupancy: avgOccupancy !== "" ? Number(avgOccupancy) : undefined,
      pricePerRoom: pricePerRoom !== "" ? Number(pricePerRoom) : undefined,
      minRoomPrice: minRoomPrice !== "" ? Number(minRoomPrice) : undefined,
      maxRoomPrice: maxRoomPrice !== "" ? Number(maxRoomPrice) : undefined,
      priceFluctuation: priceFluctuation.trim() || undefined,
      estimateStatus: estimateStatus.trim() || undefined,
      breakfastUnitPrice: breakfastUnitPrice !== "" ? Number(breakfastUnitPrice) : undefined,
      normalRoomUnitPrice: normalRoomUnitPrice !== "" ? Number(normalRoomUnitPrice) : undefined,
      halalRoomUnitPrice: halalRoomUnitPrice !== "" ? Number(halalRoomUnitPrice) : undefined,
      halalSupport: halalSupport.trim() || undefined,
      bathTax: bathTax !== "" ? Number(bathTax) : undefined,
      tenantCount: tenantCount !== "" ? Number(tenantCount) : undefined,
      cancellationPolicy: cancellationPolicy.trim() || undefined,
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
          {/* Facility No + Name */}
          <div className="flex gap-3">
            <div className="w-28 flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                施設番号
              </label>
              <input
                value={facilityNo}
                onChange={(e) => setFacilityNo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="例：0001"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                施設名 <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：グランドホテル東京"
              />
            </div>
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

          {/* Room counts */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              客室数
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">保有客室数</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={totalRooms}
                    onChange={(e) => setTotalRooms(e.target.value === "" ? "" : Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">室</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">提供客室数</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={offeredRooms}
                    onChange={(e) => setOfferedRooms(e.target.value === "" ? "" : Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">室</span>
                </div>
              </div>
            </div>
          </div>

          {/* Function room counts */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              ファンクションルーム数
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">保有室数</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={totalFunctionRooms}
                    onChange={(e) => setTotalFunctionRooms(e.target.value === "" ? "" : Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">室</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">提供室数</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={offeredFunctionRooms}
                    onChange={(e) => setOfferedFunctionRooms(e.target.value === "" ? "" : Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">室</span>
                </div>
              </div>
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

          {/* 詳細情報（折り畳み） */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setDetailOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-xs font-medium text-gray-700">詳細情報（エリア・設備・配宿・料金等）</span>
              <span className="text-gray-400 text-sm">{detailOpen ? "▲" : "▼"}</span>
            </button>
            {detailOpen && (
              <div className="px-4 py-3 space-y-4">
                {/* エリア情報 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">エリア</label>
                    <input value={area} onChange={(e) => setArea(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例：尾張、知多" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">市町村郡</label>
                    <input value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例：名古屋市" />
                  </div>
                </div>
                {/* 収容人数 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">収容可能人数（保有）</label>
                    <input type="number" min="0" value={totalCapacity} onChange={(e) => setTotalCapacity(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">収容可能人数（提供）</label>
                    <input type="number" min="0" value={offeredCapacity} onChange={(e) => setOfferedCapacity(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                </div>
                {/* ファンクション */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ファンクション利用想定数</label>
                    <input type="number" min="0" value={functionRoomEstimate} onChange={(e) => setFunctionRoomEstimate(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">乗降場</label>
                    <input value={boardingArea} onChange={(e) => setBoardingArea(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="岸壁整備 など" />
                  </div>
                </div>
                {/* 設備 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">設備</label>
                  <div className="flex gap-4">
                    {([["hasGym", "ジム", hasGym, setHasGym], ["hasSauna", "サウナ", hasSauna, setHasSauna], ["hasLaundry", "コインランドリー", hasLaundry, setHasLaundry]] as const).map(([key, label, val, setter]) => (
                      <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={val as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                {/* 貸切・食事 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">貸切想定</label>
                    <input value={exclusiveUse} onChange={(e) => setExclusiveUse(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="全棟 など" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">食事提供難易度</label>
                    <input value={mealDifficulty} onChange={(e) => setMealDifficulty(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="高・中・低 など" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">食事提供主体想定</label>
                    <input value={mealProvider} onChange={(e) => setMealProvider(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="宿泊施設 など" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">朝食会場座席数</label>
                    <input type="number" min="0" value={breakfastSeats} onChange={(e) => setBreakfastSeats(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                </div>
                {/* 配宿情報 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">配宿競技</label>
                    <input value={assignedSport} onChange={(e) => setAssignedSport(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ハンドボール（男子） など" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">会場</label>
                    <input value={assignedVenue} onChange={(e) => setAssignedVenue(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="稲沢市 など" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">人数</label>
                    <input type="number" min="0" value={assignedPersonCount} onChange={(e) => setAssignedPersonCount(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">施設別人数</label>
                    <input type="number" min="0" value={facilityPersonCount} onChange={(e) => setFacilityPersonCount(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">利用想定客室数</label>
                    <input type="number" min="0" value={utilizedRooms} onChange={(e) => setUtilizedRooms(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">平均宿泊人数</label>
                    <input type="number" min="0" value={avgOccupancy} onChange={(e) => setAvgOccupancy(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">変動有無</label>
                    <input value={priceFluctuation} onChange={(e) => setPriceFluctuation(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="有・無" />
                  </div>
                </div>
                {/* 料金情報 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">見積単価（通常）</label>
                    <input type="number" min="0" value={normalRoomUnitPrice} onChange={(e) => setNormalRoomUnitPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">見積単価（ハラル）</label>
                    <input type="number" min="0" value={halalRoomUnitPrice} onChange={(e) => setHalalRoomUnitPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">1室あたり単価（税込）</label>
                    <input type="number" min="0" value={pricePerRoom} onChange={(e) => setPricePerRoom(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">単価幅最低（税抜）</label>
                    <input type="number" min="0" value={minRoomPrice} onChange={(e) => setMinRoomPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">単価幅最高（税抜）</label>
                    <input type="number" min="0" value={maxRoomPrice} onChange={(e) => setMaxRoomPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">朝食単価</label>
                    <input type="number" min="0" value={breakfastUnitPrice} onChange={(e) => setBreakfastUnitPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">見積取得状況</label>
                    <input value={estimateStatus} onChange={(e) => setEstimateStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="取得済・依頼中 など" />
                  </div>
                </div>
                {/* その他 */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ハラル支援</label>
                    <input value={halalSupport} onChange={(e) => setHalalSupport(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="○・－ など" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">入湯税/宿泊税</label>
                    <input type="number" min="0" value={bathTax} onChange={(e) => setBathTax(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">テナント数</label>
                    <input type="number" min="0" value={tenantCount} onChange={(e) => setTenantCount(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">キャンセルポリシー</label>
                  <input value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="概要を入力" />
                </div>
              </div>
            )}
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
