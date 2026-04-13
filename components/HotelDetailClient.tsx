"use client";

import React, { useState, useMemo, Suspense, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useHotels } from "@/hooks/useHotels";
import {
  CostItem,
  CostCategory,
  COST_CATEGORIES,
  CATEGORY_COLORS,
  EVENT_COLORS,
  EVENT_LABELS,
  CONTRACT_STATUS_COLORS,
  GROUP_COLORS,
  calcHotelTotals,
  calcVariance,
  formatCurrency,
  formatDateRange,
} from "@/types";
import CostItemModal from "@/components/CostItemModal";
import HotelFormModal from "@/components/HotelFormModal";

// ─────────────────────────────────────────────
// Room charge types
// ─────────────────────────────────────────────

interface RoomRow {
  no: number;
  roomType: string;
  totalRooms: number | null;
  offeredRooms: number | null;
  checkin: string | null;
  mainStart: string | null;
  prepareDays: number | null;
  mainEnd: string | null;
  mainDays: number | null;
  checkout: string | null;
  removeDays: number | null;
  preparePrice: number | null;
  mainPrice: number | null;
  dailyAmount: number | null;
  removePrice: number | null;
  roomNights: number | null;
  lodgingFee: number | null;
  areaSqmMin: number | null;
  areaSqmMax: number | null;
  occupancy: number | null;
  bedSizeW: number | null;
  bedSizeH: number | null;
  bedCount: number | null;
  bath: string | null;
  lanWired: string | null;
  lanWireless: string | null;
  sonota: string | null;
  dailyOccupancyRef: number | null;
}

interface RoomChargeSection {
  rooms: RoomRow[];
  totalRooms: number | null;
  offeredRooms: number | null;
  roomNights: number | null;
  dailyCost: number | null;
  dailyCostTax: number | null;
  totalCost: number | null;
  totalCostTax: number | null;
}

function hasMeaningfulData(sec: RoomChargeSection): boolean {
  return (sec.rooms?.length ?? 0) > 0 || sec.dailyCost != null || sec.totalCostTax != null;
}

function fmtNum(v: number | null | undefined): string {
  return v == null ? "—" : v.toLocaleString("ja-JP") + "円";
}

function fmtInt(v: number | null | undefined): string {
  return v == null ? "—" : v.toLocaleString("ja-JP");
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  // "YYYY-MM-DD" → "M/D"
  const parts = v.split("-");
  if (parts.length === 3) return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  return v;
}

const ROOM_CHARGES_STORAGE_KEY = "room-charges-v2-uploaded";
type RoomChargesDB = Record<string, {
  hotelName: string;
  asia?: RoomChargeSection | null;
  para?: RoomChargeSection | null;
  asia_athlete?: RoomChargeSection | null;
  para_athlete?: RoomChargeSection | null;
  asia_technical_official?: RoomChargeSection | null;
  para_technical_official?: RoomChargeSection | null;
}>;

// ─────────────────────────────────────────────
// Meeting room types (別紙1-2)
// ─────────────────────────────────────────────

interface MeetingRoomRow {
  no: number;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  usageDays: number | null;
  venueName: string;
  floor: string | null;
  venueType: string | null;
  lengthM: number | null;
  widthM: number | null;
  areaSqm: number | null;
  ceilingHeightM: number | null;
  pricePerDay: number | null;
  totalPrice: number | null;
  splitAvailable: string | null;
  splitCount: number | null;
  lanWired: string | null;
  lanWiredPrice: number | null;
  lanWireless: string | null;
  lanWirelessPrice: number | null;
  sonota: string | null;
}

interface MeetingRoomSection {
  rooms: MeetingRoomRow[];
  totalDays: number | null;
  dailyCost: number | null;
  dailyCostTax: number | null;
  totalCost: number | null;
  totalCostTax: number | null;
}

const MEETING_ROOMS_STORAGE_KEY = "meeting-rooms-v1-uploaded";
type MeetingRoomsDB = Record<string, { hotelName: string; asia: MeetingRoomSection | null; para: MeetingRoomSection | null }>;

// ─────────────────────────────────────────────
// Meal cost types (別紙2)
// ─────────────────────────────────────────────

interface MealRow {
  category: string;
  mealType: string;
  unitPriceBasic: number | null;
  unitPriceHalal: number | null;
  totalMeals: number | null;
  totalAmount: number | null;
}

interface MealCostSection {
  rows: MealRow[];
  totalTaxExcluded: number | null;
  totalTaxIncluded: number | null;
}

interface MealCostEntry {
  hotelName: string;
  asia: MealCostSection | null;
  para: MealCostSection | null;
}

const MEAL_COSTS_STORAGE_KEY = "meal-costs-v1-uploaded";
type MealCostsDB = Record<string, MealCostEntry>;

// ─────────────────────────────────────────────
// Room charge table components (no hooks — safe to use anywhere)
// ─────────────────────────────────────────────

function RoomChargeSectionTable({ label, section }: { label: string; section: RoomChargeSection }) {
  const [expanded, setExpanded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom) return;
    // Set spacer width to match table scroll width
    if (spacerRef.current) spacerRef.current.style.width = bottom.scrollWidth + "px";
    const onTop = () => { bottom.scrollLeft = top.scrollLeft; };
    const onBottom = () => {
      top.scrollLeft = bottom.scrollLeft;
      if (spacerRef.current) spacerRef.current.style.width = bottom.scrollWidth + "px";
    };
    top.addEventListener("scroll", onTop);
    bottom.addEventListener("scroll", onBottom);
    return () => { top.removeEventListener("scroll", onTop); bottom.removeEventListener("scroll", onBottom); };
  }, [section, expanded]);

  if (!hasMeaningfulData(section)) return null;

  const fmt = (n: number | null | undefined) => n != null ? n.toLocaleString("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }) : "—";

  return (
    <div className="mb-4">
      {/* ヘッダー（常時表示） */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2 mb-2 hover:bg-blue-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-blue-400 transition-transform duration-200" style={{ display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
          {label}
        </span>
        <span className="flex gap-4 tabular-nums font-normal text-blue-600">
          <span>総客室: {fmtInt(section.totalRooms)} / 提供: {fmtInt(section.offeredRooms)}</span>
          <span>RN: {fmtInt(section.roomNights)}</span>
          <span className="font-bold">{fmt(section.totalCostTax ?? section.totalCost)}</span>
        </span>
      </button>

      {expanded && (
        <>
      {/* Top scrollbar mirror */}
      <div ref={topRef} className="overflow-x-scroll" style={{ height: 16, overflowY: "hidden" }}>
        <div ref={spacerRef} style={{ height: 1 }} />
      </div>
      <div ref={bottomRef} className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">No.</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">チェックイン日</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">本番期間開始日</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">準備泊数</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">本番期間終了日</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">本番泊数</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">チェックアウト日</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">撤去泊数</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">客室タイプ</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">総客室数</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">提供客室</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">準備期間客室単価/室</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">本番期間客室単価/室</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">撤去期間客室単価/室</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">ルームナイツ</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">宿泊料金</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">広さ(㎡)</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">利用人数</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">ベッドサイズ(cm)</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">ベッド数(台)</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">浴室</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">有線LAN</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">無線LAN</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">その他</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">人数参考</th>
            </tr>
          </thead>
          <tbody>
            {(section.rooms ?? []).map((r) => (
              <tr key={r.no} className="border-b border-gray-50 hover:bg-blue-50/20">
                <td className="py-2 px-2 text-center text-gray-400">{r.no}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-500">{fmtDate(r.checkin)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-500">{fmtDate(r.mainStart)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-600">{fmtInt(r.prepareDays)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-500">{fmtDate(r.mainEnd)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-600">{fmtInt(r.mainDays)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-500">{fmtDate(r.checkout)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-600">{fmtInt(r.removeDays)}</td>
                <td className="py-2 px-2 text-gray-700 font-medium">{r.roomType}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.totalRooms)}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.offeredRooms)}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.preparePrice != null ? r.preparePrice.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.mainPrice != null ? r.mainPrice.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.removePrice != null ? r.removePrice.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.roomNights)}</td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold text-gray-800">{r.lodgingFee != null ? r.lodgingFee.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.areaSqmMin != null ? (r.areaSqmMax != null && r.areaSqmMax !== r.areaSqmMin ? `${r.areaSqmMin}〜${r.areaSqmMax}` : String(r.areaSqmMin)) : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.occupancy)}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.bedSizeW != null && r.bedSizeH != null ? `${r.bedSizeW}×${r.bedSizeH}` : r.bedSizeW != null ? String(r.bedSizeW) : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.bedCount)}</td>
                <td className="py-2 px-2 text-center text-gray-600">{r.bath ?? "—"}</td>
                <td className="py-2 px-2 text-center text-gray-600">{r.lanWired ?? "—"}</td>
                <td className="py-2 px-2 text-center text-gray-600">{r.lanWireless ?? "—"}</td>
                <td className="py-2 px-2 text-gray-600 whitespace-nowrap min-w-[220px]">{r.sonota ?? "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.dailyOccupancyRef)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
              <td colSpan={9} className="py-2 px-2 text-gray-600">合計</td>
              <td className="py-2 px-2 text-right tabular-nums text-gray-700">{fmtInt(section.totalRooms)}</td>
              <td className="py-2 px-2 text-right tabular-nums text-gray-700">{fmtInt(section.offeredRooms)}</td>
              <td className="py-2 px-2" />
              <td className="py-2 px-2 text-right tabular-nums text-blue-700">{fmtNum(section.dailyCost)}</td>
              <td className="py-2 px-2" />
              <td className="py-2 px-2 text-right tabular-nums text-gray-700">{fmtInt(section.roomNights)}</td>
              <td className="py-2 px-2 text-right tabular-nums text-blue-700">{fmtNum(section.totalCostTax ?? section.totalCost)}</td>
              <td className="py-2 px-2" /><td className="py-2 px-2" /><td className="py-2 px-2" /><td className="py-2 px-2" /><td className="py-2 px-2" /><td className="py-2 px-2" /><td className="py-2 px-2" /><td className="py-2 px-2" /><td className="py-2 px-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-center">
          <div className="text-blue-500 mb-0.5">1日あたり客室費</div>
          <div className="font-bold text-blue-800 tabular-nums">{fmtNum(section.dailyCost)}</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-center">
          <div className="text-gray-500 mb-0.5">1日あたり（税込）</div>
          <div className="font-bold text-gray-800 tabular-nums">{fmtNum(section.dailyCostTax)}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 text-center">
          <div className="text-green-600 mb-0.5">客室合計（税込）</div>
          <div className="font-bold text-green-800 tabular-nums">{fmtNum(section.totalCostTax)}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
          <div className="text-emerald-600 mb-0.5">予算執行額合計</div>
          <div className="font-bold text-emerald-800 tabular-nums">{fmtNum(section.totalCostTax)}</div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

const RC_SECTION_CONFIG: { key: keyof RoomChargesDB[string]; label: string }[] = [
  { key: "asia_athlete",            label: "◆ アジア競技大会（選手）" },
  { key: "asia_technical_official", label: "◆ アジア競技大会（技術役員）" },
  { key: "para_athlete",            label: "◆ アジアパラ競技大会（選手）" },
  { key: "para_technical_official", label: "◆ アジアパラ競技大会（技術役員）" },
  { key: "asia",                    label: "◆ アジア競技大会" },
  { key: "para",                    label: "◆ アジアパラ競技大会" },
];

function RoomChargeInTab({ chargeData }: { chargeData: RoomChargesDB[string] | null }) {
  if (!chargeData) return null;
  const sections = RC_SECTION_CONFIG.filter(
    ({ key }) => chargeData[key] != null && hasMeaningfulData(chargeData[key] as RoomChargeSection)
  );
  if (sections.length === 0) return null;
  return (
    <div className="mb-5 pb-5 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-3">積算根拠（別紙1-1より）</p>
      {sections.map(({ key, label }) => (
        <RoomChargeSectionTable key={key} label={label} section={chargeData[key] as RoomChargeSection} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Meeting room table (別紙1-2)
// ─────────────────────────────────────────────

function MeetingRoomSectionTable({ label, section }: { label: string; section: MeetingRoomSection }) {
  const [expanded, setExpanded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom) return;
    if (spacerRef.current) spacerRef.current.style.width = bottom.scrollWidth + "px";
    const onTop = () => { bottom.scrollLeft = top.scrollLeft; };
    const onBottom = () => {
      top.scrollLeft = bottom.scrollLeft;
      if (spacerRef.current) spacerRef.current.style.width = bottom.scrollWidth + "px";
    };
    top.addEventListener("scroll", onTop);
    bottom.addEventListener("scroll", onBottom);
    return () => { top.removeEventListener("scroll", onTop); bottom.removeEventListener("scroll", onBottom); };
  }, [section, expanded]);

  if (!section.rooms || section.rooms.length === 0) return null;
  const fmt = (n: number | null | undefined) => n != null ? n.toLocaleString("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }) : "—";
  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2 mb-2 hover:bg-blue-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-blue-400 transition-transform duration-200" style={{ display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
          {label}
        </span>
        <span className="flex gap-4 tabular-nums font-normal text-blue-600">
          <span>会場数: {section.rooms.length}</span>
          <span>利用日数: {section.totalDays != null ? section.totalDays : "—"}</span>
          <span className="font-bold">{fmt(section.totalCostTax ?? section.totalCost)}</span>
        </span>
      </button>
      {expanded && (
        <>
      {/* Top scrollbar mirror */}
      <div ref={topRef} className="overflow-x-scroll" style={{ height: 16, overflowY: "hidden" }}>
        <div ref={spacerRef} style={{ height: 1 }} />
      </div>
      <div ref={bottomRef} className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">No.</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">利用開始日</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">利用終了日</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">利用開始時間</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">利用終了時間</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">利用日数</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">会場名</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">階数</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">会場形態</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">たて(m)</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">よこ(m)</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">広さ(㎡)</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">天井高(m)</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">料金<br/><span className="font-normal">※サ込税別</span></th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">料金計<br/><span className="font-normal">※サ込税別</span></th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">分割<br/>可否</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">分割<br/>数</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">有線<br/>LAN</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">有線LAN<br/>料金</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap">無線<br/>LAN</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">無線LAN<br/>料金</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">その他</th>
            </tr>
          </thead>
          <tbody>
            {section.rooms.map((r) => (
              <tr key={r.no} className="border-b border-gray-50 hover:bg-blue-50/20">
                <td className="py-2 px-2 text-center text-gray-400">{r.no}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-500">{fmtDate(r.startDate)}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-500">{fmtDate(r.endDate)}</td>
                <td className="py-2 px-2 text-center text-gray-500">{r.startTime ?? "—"}</td>
                <td className="py-2 px-2 text-center text-gray-500">{r.endTime ?? "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.usageDays)}</td>
                <td className="py-2 px-2 text-gray-700 font-medium">{r.venueName}</td>
                <td className="py-2 px-2 text-center text-gray-600">{r.floor ?? "—"}</td>
                <td className="py-2 px-2 text-gray-600">{r.venueType ?? "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.lengthM != null ? r.lengthM : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.widthM != null ? r.widthM : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.areaSqm != null ? r.areaSqm : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.ceilingHeightM != null ? r.ceilingHeightM : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.pricePerDay != null ? Math.round(r.pricePerDay).toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold text-gray-800">{r.totalPrice != null ? Math.round(r.totalPrice).toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-center text-gray-600">{r.splitAvailable ?? "—"}</td>
                <td className="py-2 px-2 text-center tabular-nums text-gray-600">{r.splitCount != null ? r.splitCount : "—"}</td>
                <td className="py-2 px-2 text-center text-gray-600">{r.lanWired ?? "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.lanWiredPrice != null ? r.lanWiredPrice.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-center text-gray-600">{r.lanWireless ?? "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.lanWirelessPrice != null ? r.lanWirelessPrice.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-gray-600 whitespace-nowrap min-w-[220px]">{r.sonota ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
              <td colSpan={5} className="py-2 px-2 text-gray-600">合計</td>
              <td className="py-2 px-2 text-right tabular-nums text-gray-700">{fmtInt(section.totalDays)}</td>
              <td colSpan={8} className="py-2 px-2" />
              <td className="py-2 px-2 text-right tabular-nums text-blue-700">{fmtNum(section.dailyCost)}</td>
              <td className="py-2 px-2 text-right tabular-nums text-blue-700">{fmtNum(section.totalCostTax ?? section.totalCost)}</td>
              <td colSpan={7} className="py-2 px-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-center">
          <div className="text-blue-500 mb-0.5">1日あたり会場費</div>
          <div className="font-bold text-blue-800 tabular-nums">{fmtNum(section.dailyCost)}</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-center">
          <div className="text-gray-500 mb-0.5">1日あたり（税込）</div>
          <div className="font-bold text-gray-800 tabular-nums">{fmtNum(section.dailyCostTax)}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 text-center">
          <div className="text-green-600 mb-0.5">会場合計（税別）</div>
          <div className="font-bold text-green-800 tabular-nums">{fmtNum(section.totalCost)}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 text-center">
          <div className="text-green-600 mb-0.5">会場合計（税サ込）</div>
          <div className="font-bold text-green-800 tabular-nums">{fmtNum(section.totalCostTax)}</div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function MeetingRoomInTab({ meetingData }: { meetingData: MeetingRoomsDB[string] | null }) {
  if (!meetingData) return null;
  const hasAsia = meetingData.asia != null && (meetingData.asia.rooms?.length ?? 0) > 0;
  const hasPara = meetingData.para != null && (meetingData.para.rooms?.length ?? 0) > 0;
  if (!hasAsia && !hasPara) return null;
  return (
    <div className="mb-5 pb-5 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-3">積算根拠（別紙1-2より）</p>
      {hasAsia && <MeetingRoomSectionTable label="◆ アジア競技大会" section={meetingData.asia!} />}
      {hasPara && <MeetingRoomSectionTable label="◆ アジアパラ競技大会" section={meetingData.para!} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// Meal cost table (別紙2)
// ─────────────────────────────────────────────

function MealCostSectionTable({ label, section }: { label: string; section: MealCostSection }) {
  if (!section.rows || section.rows.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded px-3 py-1 mb-2 inline-block">{label}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">食事カテゴリー</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap">食事種類</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Basic単価</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Halal/vegan単価</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">合計食数</th>
              <th className="text-right py-2 px-2 font-medium whitespace-nowrap">料金</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-orange-50/20">
                <td className="py-2 px-2 text-gray-700 font-medium">{r.category}</td>
                <td className="py-2 px-2 text-gray-600">{r.mealType}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.unitPriceBasic != null ? r.unitPriceBasic.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{r.unitPriceHalal != null ? r.unitPriceHalal.toLocaleString("ja-JP") : "—"}</td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-600">{fmtInt(r.totalMeals)}</td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold text-gray-800">{r.totalAmount != null ? r.totalAmount.toLocaleString("ja-JP") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs max-w-xs">
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 text-center">
          <div className="text-orange-500 mb-0.5">合計（税別）</div>
          <div className="font-bold text-orange-800 tabular-nums">{fmtNum(section.totalTaxExcluded)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-center">
          <div className="text-amber-600 mb-0.5">合計（税込）</div>
          <div className="font-bold text-amber-800 tabular-nums">{fmtNum(section.totalTaxIncluded)}</div>
        </div>
      </div>
    </div>
  );
}

function MealCostInTab({ mealData }: { mealData: MealCostEntry | null }) {
  if (!mealData) return null;
  const hasAsia = mealData.asia != null && (mealData.asia.rows?.length ?? 0) > 0;
  const hasPara = mealData.para != null && (mealData.para.rows?.length ?? 0) > 0;
  if (!hasAsia && !hasPara) return null;
  return (
    <div className="mb-5 pb-5 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-3">積算根拠（別紙2より）</p>
      {hasAsia && <MealCostSectionTable label="◆ アジア競技大会" section={mealData.asia!} />}
      {hasPara && <MealCostSectionTable label="◆ アジアパラ競技大会" section={mealData.para!} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// Per-hotel upload button
// ─────────────────────────────────────────────

function UploadButton({
  label,
  onFile,
  uploading,
  uploadError,
  uploadSuccess,
}: {
  label: string;
  onFile: (file: File) => void;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        {uploading ? "処理中..." : `↑ ${label}`}
      </button>
      {uploadSuccess && <span className="text-xs text-emerald-600">取込済</span>}
      {uploadError && <span className="text-xs text-red-500">{uploadError}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────


function TabBtn({
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
      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded-full leading-none ${
        active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
      }`}
    >
      {count}
    </span>
  );
}

function CostTable({
  items,
  onEdit,
  onDelete,
  showCategory = true,
}: {
  items: CostItem[];
  onEdit: (item: CostItem) => void;
  onDelete: (id: string, desc: string) => void;
  showCategory?: boolean;
}) {
  const totalBudget = items.reduce((s, i) => s + i.budgetAmount, 0);
  const totalActual = items.reduce((s, i) => s + i.actualAmount, 0);
  const totalVariance = calcVariance(totalBudget, totalActual);

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-5">
      <table className="w-full text-sm min-w-[580px]">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50/70">
            <th className="text-left py-2 px-3 font-medium">大会</th>
            {showCategory && (
              <th className="text-left py-2 px-3 font-medium">費目</th>
            )}
            <th className="text-left py-2 px-3 font-medium">内容</th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              単価×人数×泊
            </th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              予算額
            </th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              実績額
            </th>
            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
              乖離
            </th>
            <th className="text-left py-2 px-3 font-medium">備考</th>
            <th className="py-2 px-2 w-16" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const v = calcVariance(item.budgetAmount, item.actualAmount);
            const hasBreakdown =
              item.unitPrice > 0 && item.personCount > 0 && item.nights > 0;
            return (
              <tr
                key={item.id}
                className="border-b border-gray-50 hover:bg-blue-50/30 group transition-colors"
              >
                <td className="py-2.5 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                      EVENT_COLORS[item.event]
                    }`}
                  >
                    {EVENT_LABELS[item.event]}
                  </span>
                </td>
                {showCategory && (
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                        CATEGORY_COLORS[item.category]
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>
                )}
                <td className="py-2.5 px-3 text-gray-700 font-medium">
                  {item.description}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-400 text-xs whitespace-nowrap tabular-nums">
                  {hasBreakdown
                    ? `${item.unitPrice.toLocaleString("ja-JP")} × ${
                        item.personCount
                      } × ${item.nights}`
                    : "—"}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-500 whitespace-nowrap tabular-nums">
                  {formatCurrency(item.budgetAmount)}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-800 whitespace-nowrap tabular-nums">
                  {formatCurrency(item.actualAmount)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right whitespace-nowrap tabular-nums text-sm font-medium ${v.className}`}
                >
                  {v.text}
                </td>
                <td className="py-2.5 px-3 text-gray-400 text-xs max-w-[140px] truncate">
                  {item.notes || "—"}
                </td>
                <td className="py-2 px-2 whitespace-nowrap">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1 text-gray-300 hover:text-blue-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="編集"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(item.id, item.description)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="削除"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
            <td
              colSpan={showCategory ? 4 : 3}
              className="py-2.5 px-3 text-gray-600"
            >
              合計
            </td>
            <td className="py-2.5 px-3 text-right text-gray-600 whitespace-nowrap tabular-nums">
              {formatCurrency(totalBudget)}
            </td>
            <td className="py-2.5 px-3 text-right text-gray-900 whitespace-nowrap tabular-nums">
              {formatCurrency(totalActual)}
            </td>
            <td
              className={`py-2.5 px-3 text-right whitespace-nowrap tabular-nums ${totalVariance.className}`}
            >
              {totalVariance.text}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Category view components
// ─────────────────────────────────────────────

type CategoryStats = Record<
  CostCategory,
  { items: CostItem[]; budget: number; actual: number }
>;

function AllCategoriesView({
  categoryStats,
  allItems,
  onAdd,
  onEdit,
  onDelete,
}: {
  categoryStats: CategoryStats;
  allItems: CostItem[];
  onAdd: (cat?: CostCategory) => void;
  onEdit: (item: CostItem) => void;
  onDelete: (id: string, desc: string) => void;
}) {
  if (allItems.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-base mb-3">費用データがありません</p>
        <button
          onClick={() => onAdd()}
          className="text-sm text-blue-600 hover:underline"
        >
          ＋ 費用を追加する
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {COST_CATEGORIES.map((cat) => {
        const { items, budget, actual } = categoryStats[cat];
        if (items.length === 0) return null;
        const v = calcVariance(budget, actual);
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[cat]}`}
                >
                  {cat}
                </span>
                <span className="text-sm text-gray-500 tabular-nums">
                  予算 {formatCurrency(budget)}
                </span>
                <span className="text-gray-300 text-xs">→</span>
                <span className="text-sm font-medium text-gray-700 tabular-nums">
                  実績 {formatCurrency(actual)}
                </span>
                <span className={`text-sm ${v.className}`}>{v.text}</span>
              </div>
              <button
                onClick={() => onAdd(cat)}
                className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-100 border border-blue-200 transition-colors flex-shrink-0"
              >
                ＋ 追加
              </button>
            </div>
            <CostTable
              items={items}
              onEdit={onEdit}
              onDelete={onDelete}
              showCategory={false}
            />
          </div>
        );
      })}
      <div className="pt-3 flex justify-end border-t border-gray-100">
        <button
          onClick={() => onAdd()}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          ＋ 費用追加
        </button>
      </div>
    </div>
  );
}

function SingleCategoryView({
  stats,
  onAdd,
  onEdit,
  onDelete,
  showAdd = true,
}: {
  stats: { items: CostItem[]; budget: number; actual: number };
  onAdd: () => void;
  onEdit: (item: CostItem) => void;
  onDelete: (id: string, desc: string) => void;
  showAdd?: boolean;
}) {
  const { items, budget, actual } = stats;
  const v = calcVariance(budget, actual);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-gray-500">
            予算:{" "}
            <span className="font-medium text-gray-700 tabular-nums">
              {formatCurrency(budget)}
            </span>
          </span>
          <span className="text-gray-500">
            実績:{" "}
            <span className="font-semibold text-gray-800 tabular-nums">
              {formatCurrency(actual)}
            </span>
          </span>
          <span className={`font-medium ${v.className}`}>{v.text}</span>
        </div>
        {showAdd && (
          <button
            onClick={onAdd}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            ＋ 費用追加
          </button>
        )}
      </div>
      {items.length === 0 ? (
        !showAdd ? null : (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="mb-3">この費目にはデータがありません</p>
          <button
            onClick={onAdd}
            className="text-sm text-blue-600 hover:underline"
          >
            ＋ 費用を追加する
          </button>
        </div>
        )
      ) : (
        <CostTable
          items={items}
          onEdit={onEdit}
          onDelete={onDelete}
          showCategory={false}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────

export default function HotelDetailClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400 text-lg">読み込み中...</div></div>}>
      <HotelDetailInner />
    </Suspense>
  );
}

type Mode = "budget" | "current";
const HOTEL_STORAGE_KEYS: Record<Mode, { hotels: string; rc: string; mr: string }> = {
  budget: { hotels: "hotel-budget-data-v2", rc: "room-charges-v2-uploaded", mr: "meeting-rooms-v1-uploaded" },
  current: { hotels: "current-hotels-v1", rc: "current-rc-v1", mr: "current-mr-v1" },
};

// ─────────────────────────────────────────────
// 差額比較コンポーネント（現状金額モード専用）
// ─────────────────────────────────────────────

function CurrentModeExecContractTabs({
  tab, setTab, execContent, contractContent, diffContent, hideDiff,
}: {
  tab: "exec" | "contract" | "diff";
  setTab: (t: "exec" | "contract" | "diff") => void;
  execContent: React.ReactNode;
  contractContent: React.ReactNode;
  diffContent: React.ReactNode;
  hideDiff?: boolean;
}) {
  const tabs = hideDiff
    ? (["exec", "contract"] as const)
    : (["exec", "contract", "diff"] as const);
  const label = (t: string) => t === "exec" ? "予算執行額" : t === "contract" ? "契約額" : "差額比較";
  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t as "exec" | "contract" | "diff")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label(t)}
          </button>
        ))}
      </div>
      {tab === "exec" && execContent}
      {tab === "contract" && contractContent}
      {tab === "diff" && !hideDiff && diffContent}
    </div>
  );
}

function CurrentModeDiffView({ execEntry, contractEntry }: { execEntry: RoomChargesDB[string]|null, contractEntry: RoomChargesDB[string]|null }) {
  if (!execEntry && !contractEntry) return <p className="text-sm text-gray-400">予算執行額と契約額のデータをアップロードしてください</p>;

  const fmt = (n: number) => n.toLocaleString("ja-JP", {style:"currency",currency:"JPY",maximumFractionDigits:0});

  const sections: {label:string; exec: RoomChargeSection|null; contract: RoomChargeSection|null}[] = [
    { label: "アジア競技大会（選手）",        exec: execEntry?.asia_athlete??null,            contract: contractEntry?.asia_athlete??null },
    { label: "アジア競技大会（技術役員）",    exec: execEntry?.asia_technical_official??null, contract: contractEntry?.asia_technical_official??null },
    { label: "アジアパラ競技大会（選手）",    exec: execEntry?.para_athlete??null,            contract: contractEntry?.para_athlete??null },
    { label: "アジアパラ競技大会（技術役員）",exec: execEntry?.para_technical_official??null, contract: contractEntry?.para_technical_official??null },
    { label: "アジア競技大会",                exec: execEntry?.asia??null,                    contract: contractEntry?.asia??null },
    { label: "アジアパラ競技大会",            exec: execEntry?.para??null,                    contract: contractEntry?.para??null },
  ];

  return (
    <div className="space-y-6">
      {sections.filter(s => s.exec || s.contract).map(sec => {
        const execTotal = sec.exec?.totalCostTax ?? sec.exec?.totalCost ?? 0;
        const contractTotal = sec.contract?.totalCostTax ?? sec.contract?.totalCost ?? 0;
        const diff = (execTotal ?? 0) - (contractTotal ?? 0);
        return (
          <div key={sec.label}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{sec.label}</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">予算執行額合計</div>
                <div className="text-lg font-bold text-blue-700">{fmt(execTotal ?? 0)}</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">契約額合計</div>
                <div className="text-lg font-bold text-green-700">{fmt(contractTotal ?? 0)}</div>
              </div>
              <div className={`border rounded-lg p-3 ${diff >= 0 ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`}>
                <div className="text-xs text-gray-500">差額（執行−契約）</div>
                <div className={`text-lg font-bold ${diff > 0 ? "text-gray-700" : diff < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {diff < 0 ? "▲" : diff > 0 ? "+" : "±"}{fmt(Math.abs(diff))}
                </div>
              </div>
            </div>
            {/* 客室タイプ別比較 */}
            {(sec.exec?.rooms || sec.contract?.rooms) && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">客室タイプ</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">執行額</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">契約額</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">差額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allTypes = Array.from(new Set([...(sec.exec?.rooms??[]).map(r=>r.roomType), ...(sec.contract?.rooms??[]).map(r=>r.roomType)]));
                      return allTypes.map(rt => {
                        const eRow = sec.exec?.rooms.find(r=>r.roomType===rt);
                        const cRow = sec.contract?.rooms.find(r=>r.roomType===rt);
                        const eFee = eRow?.lodgingFee ?? 0;
                        const cFee = cRow?.lodgingFee ?? 0;
                        const d = (eFee ?? 0) - (cFee ?? 0);
                        return (
                          <tr key={rt} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-3 py-2">{rt}</td>
                            <td className="border border-gray-200 px-3 py-2 text-right">{eFee ? fmt(eFee) : "—"}</td>
                            <td className="border border-gray-200 px-3 py-2 text-right">{cFee ? fmt(cFee) : "—"}</td>
                            <td className={`border border-gray-200 px-3 py-2 text-right font-medium ${d < 0 ? "text-red-600" : d > 0 ? "text-gray-700" : "text-gray-400"}`}>
                              {d === 0 ? "±0" : `${d<0?"▲":"+"}${fmt(Math.abs(d))}`}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CurrentModeMrDiffView({ execEntry, contractEntry }: { execEntry: MeetingRoomsDB[string]|null, contractEntry: MeetingRoomsDB[string]|null }) {
  if (!execEntry && !contractEntry) return <p className="text-sm text-gray-400">予算執行額と契約額のデータをアップロードしてください</p>;
  const fmt = (n: number) => n.toLocaleString("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
  const sections = [
    { label: "アジア競技大会", exec: execEntry?.asia ?? null, contract: contractEntry?.asia ?? null },
    { label: "パラ競技大会",   exec: execEntry?.para ?? null, contract: contractEntry?.para ?? null },
  ];
  return (
    <div className="space-y-6">
      {sections.filter(s => s.exec || s.contract).map(sec => {
        const execTotal = sec.exec?.totalCostTax ?? sec.exec?.totalCost ?? 0;
        const contractTotal = sec.contract?.totalCostTax ?? sec.contract?.totalCost ?? 0;
        const diff = execTotal - contractTotal;
        return (
          <div key={sec.label}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{sec.label}</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">予算執行額合計</div>
                <div className="text-lg font-bold text-blue-700">{fmt(execTotal)}</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">契約額合計</div>
                <div className="text-lg font-bold text-green-700">{fmt(contractTotal)}</div>
              </div>
              <div className={`border rounded-lg p-3 ${diff >= 0 ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`}>
                <div className="text-xs text-gray-500">差額（執行−契約）</div>
                <div className={`text-lg font-bold ${diff > 0 ? "text-gray-700" : diff < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {diff === 0 ? "±0" : `${diff < 0 ? "▲" : "+"}${fmt(Math.abs(diff))}`}
                </div>
              </div>
            </div>
            {(sec.exec?.rooms || sec.contract?.rooms) && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">会場名</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">執行額</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">契約額</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">差額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allVenues = Array.from(new Set([...(sec.exec?.rooms ?? []).map(r => r.venueName), ...(sec.contract?.rooms ?? []).map(r => r.venueName)]));
                      return allVenues.map(vn => {
                        const eRow = sec.exec?.rooms.find(r => r.venueName === vn);
                        const cRow = sec.contract?.rooms.find(r => r.venueName === vn);
                        const eFee = eRow?.totalPrice ?? 0;
                        const cFee = cRow?.totalPrice ?? 0;
                        const d = eFee - cFee;
                        return (
                          <tr key={vn} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-3 py-2">{vn}</td>
                            <td className="border border-gray-200 px-3 py-2 text-right">{eFee ? fmt(eFee) : "—"}</td>
                            <td className="border border-gray-200 px-3 py-2 text-right">{cFee ? fmt(cFee) : "—"}</td>
                            <td className={`border border-gray-200 px-3 py-2 text-right font-medium ${d < 0 ? "text-red-600" : d > 0 ? "text-gray-700" : "text-gray-400"}`}>
                              {d === 0 ? "±0" : `${d < 0 ? "▲" : "+"}${fmt(Math.abs(d))}`}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type SheetPending = {
  file: File;
  rcSheets: string[];   // 別紙1-1 candidates
  mrSheets: string[];   // 別紙1-2 candidates
  selectedRc: string | null;  // null = 読み込まない
  selectedMr: string | null;
  action: "hotelExec" | "hotelContract" | "rc" | "mr" | "currentExec" | "currentContract" | "currentMrExec" | "currentMrContract";
};

type VersionedEntry<T> = {
  versionName: string;   // ファイル名（拡張子除く）
  uploadedAt: string;    // ISO timestamp
  data: T;
};

type MatchPending = {
  versionName: string;
  detectedName: string | null;       // Excelから読み取った施設名
  suggestedHotelId: string | null;   // 自動マッチング結果
  rcIncoming: RoomChargesDB[string] | null;
  mrIncoming: MeetingRoomsDB[string] | null;
  uploadType: "exec" | "contract";
};

function HotelDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") ?? "";
  const rawMode = searchParams?.get("mode") ?? "budget";
  const mode: Mode = (rawMode === "current") ? "current" : "budget";
  const modeKeys = HOTEL_STORAGE_KEYS[mode];
  const router = useRouter();
  const { hotels, initialized, addCostItem, updateCostItem, deleteCostItem, updateHotel } =
    useHotels(modeKeys.hotels);
  const [hotelEditOpen, setHotelEditOpen] = useState(false);
  const [facilityInfoOpen, setFacilityInfoOpen] = useState(false);
  const [functionRoomOpen, setFunctionRoomOpen] = useState(false);

  // ── Room charge DB (from uploaded Excel or static JSON) ───────────────────
  const [roomChargeDb, setRoomChargeDb] = useState<RoomChargesDB | null>(null);
  useEffect(() => {
    try {
      const s = localStorage.getItem(modeKeys.rc);
      if (s) { setRoomChargeDb(JSON.parse(s) as RoomChargesDB); return; }
    } catch { /* ignore */ }
    if (mode === "budget") {
      fetch("/budget-app/room-charges.json")
        .then((r) => r.json())
        .then((data) => setRoomChargeDb(data as RoomChargesDB))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === modeKeys.rc && e.newValue) {
        try { setRoomChargeDb(JSON.parse(e.newValue) as RoomChargesDB); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Meeting room DB (from uploaded Excel or static JSON) ──────────────────
  const [meetingRoomDb, setMeetingRoomDb] = useState<MeetingRoomsDB | null>(null);
  useEffect(() => {
    try {
      const s = localStorage.getItem(modeKeys.mr);
      if (s) { setMeetingRoomDb(JSON.parse(s) as MeetingRoomsDB); return; }
    } catch { /* ignore */ }
    if (mode === "budget") {
      fetch("/budget-app/meeting-rooms.json")
        .then((r) => r.json())
        .then((data) => setMeetingRoomDb(data as MeetingRoomsDB))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === modeKeys.mr && e.newValue) {
        try { setMeetingRoomDb(JSON.parse(e.newValue) as MeetingRoomsDB); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Meal cost DB (bulk, no static JSON fallback) ───────────────────────────
  const [mealCostDb, setMealCostDb] = useState<MealCostsDB | null>(null);
  useEffect(() => {
    try {
      const s = localStorage.getItem(MEAL_COSTS_STORAGE_KEY);
      if (s) setMealCostDb(JSON.parse(s) as MealCostsDB);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === MEAL_COSTS_STORAGE_KEY && e.newValue) {
        try { setMealCostDb(JSON.parse(e.newValue) as MealCostsDB); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ── Per-hotel entries (override bulk DB) ──────────────────────────────────
  const [perHotelRcEntry, setPerHotelRcEntry] = useState<RoomChargesDB[string] | null>(null);
  const [perHotelMrEntry, setPerHotelMrEntry] = useState<MeetingRoomsDB[string] | null>(null);
  const [perHotelMcEntry, setPerHotelMcEntry] = useState<MealCostEntry | null>(null);

  // ── Per-hotel upload state ────────────────────────────────────────────────
  const [rcUploading, setRcUploading] = useState(false);
  const [rcUploadError, setRcUploadError] = useState<string | null>(null);
  const [mrUploading, setMrUploading] = useState(false);
  const [mrUploadError, setMrUploadError] = useState<string | null>(null);
  const [mcUploading, setMcUploading] = useState(false);
  const [mcUploadError, setMcUploadError] = useState<string | null>(null);

  // ── 現状金額モード: 予算執行額と契約額（バージョン管理） ─────────────────────
  // 客室確保費（別紙1-1）
  const [execRcVersions, setExecRcVersions] = useState<VersionedEntry<RoomChargesDB[string]>[]>([]);
  const [contractRcVersions, setContractRcVersions] = useState<VersionedEntry<RoomChargesDB[string]>[]>([]);
  const [execRcSelectedIdx, setExecRcSelectedIdx] = useState<number | null>(null);
  const [contractRcSelectedIdx, setContractRcSelectedIdx] = useState<number | null>(null);
  // 会議室等確保費（別紙1-2）
  const [execMrVersions, setExecMrVersions] = useState<VersionedEntry<MeetingRoomsDB[string]>[]>([]);
  const [contractMrVersions, setContractMrVersions] = useState<VersionedEntry<MeetingRoomsDB[string]>[]>([]);
  const [execMrSelectedIdx, setExecMrSelectedIdx] = useState<number | null>(null);
  const [contractMrSelectedIdx, setContractMrSelectedIdx] = useState<number | null>(null);
  // ホテル単位アップロード
  const [hotelUploading, setHotelUploading] = useState(false);
  const [hotelUploadError, setHotelUploadError] = useState<string | null>(null);
  const [hotelUploadMsg, setHotelUploadMsg] = useState<string | null>(null);
  // カテゴリ別サブタブ（exec/contract/diff）
  const [rcSubTab, setRcSubTab] = useState<"exec"|"contract"|"diff">("exec");
  const [mrSubTab, setMrSubTab] = useState<"exec"|"contract"|"diff">("exec");
  const [otherSubTab, setOtherSubTab] = useState<"exec"|"contract"|"diff">("exec");
  const [sheetPending, setSheetPending] = useState<SheetPending | null>(null);
  const [matchPending, setMatchPending] = useState<MatchPending | null>(null);
  const [matchSelectedHotelId, setMatchSelectedHotelId] = useState<string>("");
  // 個別アップロード（後方互換）
  const [execUploading, setExecUploading] = useState(false);
  const [contractUploading, setContractUploading] = useState(false);
  const [execUploadError, setExecUploadError] = useState<string | null>(null);
  const [contractUploadError, setContractUploadError] = useState<string | null>(null);
  const [pendingUploadData, setPendingUploadData] = useState<{entry: RoomChargesDB[string]; type: "exec"|"contract"; detectedName: string|null} | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  // currentModeTab は後方互換のために残す（使用箇所を新変数に移行済み）
  const [currentModeTab, setCurrentModeTab] = useState<"exec"|"contract"|"diff">("exec");

  const [hotelSearchQuery, setHotelSearchQuery] = useState("");
  const [hotelDropdownOpen, setHotelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setHotelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredHotelsForDropdown = useMemo(() => {
    const q = hotelSearchQuery.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.location ?? "").toLowerCase().includes(q) ||
        (h.facilityNo ?? "").toLowerCase().includes(q)
    );
  }, [hotels, hotelSearchQuery]);

  const hotel = useMemo(
    () => hotels.find((h) => h.id === id),
    [hotels, id]
  );

  // Load per-hotel entries from localStorage once hotel is known
  useEffect(() => {
    // ホテル切り替え時にまず全stateをリセット
    setPerHotelRcEntry(null);
    setPerHotelMrEntry(null);
    setPerHotelMcEntry(null);
    setExecRcVersions([]);
    setContractRcVersions([]);
    setExecRcSelectedIdx(null);
    setContractRcSelectedIdx(null);
    setExecMrVersions([]);
    setContractMrVersions([]);
    setExecMrSelectedIdx(null);
    setContractMrSelectedIdx(null);

    const facilityNo = hotel?.facilityNo ? String(parseInt(hotel.facilityNo, 10)) : null;
    if (!facilityNo) return;
    try {
      const rc = localStorage.getItem(`room-charges-hotel-${facilityNo}`);
      if (rc) setPerHotelRcEntry(JSON.parse(rc));
    } catch { /* ignore */ }
    try {
      const mr = localStorage.getItem(`meeting-rooms-hotel-${facilityNo}`);
      if (mr) setPerHotelMrEntry(JSON.parse(mr));
    } catch { /* ignore */ }
    try {
      const mc = localStorage.getItem(`meal-costs-hotel-${facilityNo}`);
      if (mc) setPerHotelMcEntry(JSON.parse(mc));
    } catch { /* ignore */ }
    // 現状金額モード: 予算執行額・契約額（バージョン管理）
    if (mode === "current" && hotel?.facilityNo) {
      const parseVNumLocal = (versionName: string): number => {
        const m = versionName.match(/[０-９0-9]+/);
        if (!m) return 0;
        const s = m[0].replace(/[０-９]/g, (c: string) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
        return parseInt(s, 10);
      };
      const loadVersions = <T,>(key: string, setter: (v: VersionedEntry<T>[]) => void) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const sorted = [...(parsed as VersionedEntry<T>[])].sort(
              (a, b) => parseVNumLocal(a.versionName) - parseVNumLocal(b.versionName)
            );
            setter(sorted);
          }
        } catch { /* ignore */ }
      };
      loadVersions<RoomChargesDB[string]>(`current-exec-rc-versions-${hotel.facilityNo}`, setExecRcVersions);
      loadVersions<RoomChargesDB[string]>(`current-contract-rc-versions-${hotel.facilityNo}`, setContractRcVersions);
      loadVersions<MeetingRoomsDB[string]>(`current-exec-mr-versions-${hotel.facilityNo}`, setExecMrVersions);
      loadVersions<MeetingRoomsDB[string]>(`current-contract-mr-versions-${hotel.facilityNo}`, setContractMrVersions);
    }
  }, [hotel?.facilityNo, mode]);

  const roomChargeData = useMemo(() => {
    if (!hotel?.facilityNo) return null;
    if (perHotelRcEntry) return perHotelRcEntry;
    if (!roomChargeDb) return null;
    const key = String(parseInt(hotel.facilityNo, 10));
    return roomChargeDb[key] ?? null;
  }, [hotel, roomChargeDb, perHotelRcEntry]);

  const meetingRoomData = useMemo(() => {
    if (!hotel?.facilityNo) return null;
    if (perHotelMrEntry) return perHotelMrEntry;
    if (!meetingRoomDb) return null;
    const key = String(parseInt(hotel.facilityNo, 10));
    return meetingRoomDb[key] ?? null;
  }, [hotel, meetingRoomDb, perHotelMrEntry]);

  const mealCostData = useMemo(() => {
    if (!hotel?.facilityNo) return null;
    if (perHotelMcEntry) return perHotelMcEntry;
    if (!mealCostDb) return null;
    const key = String(parseInt(hotel.facilityNo, 10));
    return mealCostDb[key] ?? null;
  }, [hotel, mealCostDb, perHotelMcEntry]);

  const [activeCategory, setActiveCategory] = useState<CostCategory | "all">(
    "all"
  );
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<
    CostCategory | undefined
  >(undefined);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-5xl mb-1">🏨</div>
        <div className="text-red-500 text-lg font-medium">
          ホテルが見つかりませんでした
        </div>
        <Link href={`/?mode=${mode}`} className="text-blue-600 hover:underline text-sm">
          ← メイン画面に戻る
        </Link>
      </div>
    );
  }

  const totals = calcHotelTotals(hotel);

  const categoryStats: CategoryStats = COST_CATEGORIES.reduce((acc, cat) => {
    const items = hotel.costItems.filter((i) => i.category === cat);
    acc[cat] = {
      items,
      budget: items.reduce((s, i) => s + i.budgetAmount, 0),
      actual: items.reduce((s, i) => s + i.actualAmount, 0),
    };
    return acc;
  }, {} as CategoryStats);

  // 客室確保費の実績はExcel取込データ（客室合計税込）を優先する
  const roomChargeActual: number | null = (() => {
    if (!roomChargeData) return null;
    const asiaTax = roomChargeData.asia?.totalCostTax ?? roomChargeData.asia?.totalCost ?? null;
    const paraTax = roomChargeData.para?.totalCostTax ?? roomChargeData.para?.totalCost ?? null;
    if (asiaTax == null && paraTax == null) return null;
    return (asiaTax ?? 0) + (paraTax ?? 0);
  })();

  if (roomChargeActual != null) {
    categoryStats["客室確保費"] = {
      ...categoryStats["客室確保費"],
      actual: roomChargeActual,
    };
  }

  // 会議室等確保費の実績はExcel取込データ（会場合計税サ込）を優先する
  const meetingRoomActual: number | null = (() => {
    if (!meetingRoomData) return null;
    const asiaTax = meetingRoomData.asia?.totalCostTax ?? meetingRoomData.asia?.totalCost ?? null;
    const paraTax = meetingRoomData.para?.totalCostTax ?? meetingRoomData.para?.totalCost ?? null;
    if (asiaTax == null && paraTax == null) return null;
    return (asiaTax ?? 0) + (paraTax ?? 0);
  })();

  if (meetingRoomActual != null) {
    categoryStats["会議室等確保費"] = {
      ...categoryStats["会議室等確保費"],
      actual: meetingRoomActual,
    };
  }

  const kyashituItems = hotel.costItems.filter(i => i.category === "客室確保費").reduce((s, i) => s + i.actualAmount, 0);
  const kaigishitsuItems = hotel.costItems.filter(i => i.category === "会議室等確保費").reduce((s, i) => s + i.actualAmount, 0);
  const adjustedActual = totals.actual
    + (roomChargeActual != null ? roomChargeActual - kyashituItems : 0)
    + (meetingRoomActual != null ? meetingRoomActual - kaigishitsuItems : 0);
  const adjustedTotals = { ...totals, actual: adjustedActual };

  const variance = calcVariance(adjustedTotals.budget, adjustedTotals.actual);

  // 現状金額モード: 予算執行額から執行済額を算出
  // ロジック:
  //   1. セクションキーごとに最大金額バージョンを選ぶ
  //   2. 選ばれたセクション間の日付範囲（checkin〜checkout）を比較
  //   3. 完全に独立 → 合算、一部重複 → 警告表示
  const RC_ALL_SECTION_KEYS = ["asia_athlete", "para_athlete", "asia_technical_official", "para_technical_official", "asia", "para"] as const;
  const EXEC_SECTION_LABELS: Record<string, string> = {
    asia_athlete: "アジア選手", para_athlete: "パラ選手",
    asia_technical_official: "アジア技術役員", para_technical_official: "パラ技術役員",
    asia: "アジア", para: "パラ",
  };
  const execRcComputed: { total: number | null; warnings: string[]; bestVersionNames: Set<string>; mrBestVersionNames: Set<string> } = (() => {
    // バージョン名から数値を抽出（予算執行１４ → 14）：「最新」ラベル表示用
    const parseVersionNum = (versionName: string): number => {
      const m = versionName.match(/[０-９0-9]+/);
      if (!m) return 0;
      const s = m[0].replace(/[０-９]/g, (c: string) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
      return parseInt(s, 10);
    };

    if (mode !== "current" || execRcVersions.length === 0) return { total: null, warnings: [] as string[], bestVersionNames: new Set<string>(), mrBestVersionNames: new Set<string>() };

    // ─── 執行済み額計算: アジア/パラグループごとにRC+MR合算で最大金額バージョンを選択 ───
    // グループ: アジア (asia_*/asia) とパラ (para_*/para) は独立して評価
    const GROUPS = [
      { rcKeys: ['asia_athlete', 'asia_technical_official'] as const, mrKey: 'asia' as const },
      { rcKeys: ['para_athlete', 'para_technical_official'] as const, mrKey: 'para' as const },
    ];

    const allVersionNames = Array.from(new Set([
      ...execRcVersions.map(v => v.versionName),
      ...execMrVersions.map(v => v.versionName),
    ]));

    let grandTotal = 0;
    const execBestVersionNames = new Set<string>(); // 執行済み額計算に使ったバージョン（警告用）

    const warningEntries: { key: string; versionName: string; total: number; range: { min: string | null; max: string | null } }[] = [];

    const getRange = (sec: any) => {
      const rooms: any[] = sec?.rooms ?? [];
      const checkins = rooms.map((r: any) => r.checkin).filter(Boolean).sort();
      const checkouts = rooms.map((r: any) => r.checkout).filter(Boolean).sort();
      return { min: checkins[0] ?? null, max: checkouts[checkouts.length - 1] ?? null };
    };

    for (const group of GROUPS) {
      let bestVersionName = '';
      let bestCombinedTotal = -1;

      for (const vName of allVersionNames) {
        const rcVersion = execRcVersions.find(v => v.versionName === vName);
        const mrVersion = execMrVersions.find(v => v.versionName === vName);
        let combined = 0;
        let hasData = false;

        if (rcVersion) {
          for (const k of group.rcKeys) {
            const sec = (rcVersion.data as any)[k];
            if (sec) { combined += (sec.totalCostTax ?? sec.totalCost ?? 0) as number; hasData = true; }
          }
        }
        if (mrVersion) {
          const sec = (mrVersion.data as any)[group.mrKey];
          if (sec) { combined += (sec.totalCostTax ?? sec.totalCost ?? 0) as number; hasData = true; }
        }

        if (hasData && combined > bestCombinedTotal) {
          bestCombinedTotal = combined;
          bestVersionName = vName;
        }
      }

      if (bestVersionName && bestCombinedTotal > 0) {
        grandTotal += bestCombinedTotal;
        execBestVersionNames.add(bestVersionName);

        // 警告用エントリ（日付重複チェック）
        const rcVersion = execRcVersions.find(v => v.versionName === bestVersionName);
        if (rcVersion) {
          for (const k of group.rcKeys) {
            const sec = (rcVersion.data as any)[k];
            if (sec) warningEntries.push({ key: k, versionName: bestVersionName, total: (sec.totalCostTax ?? sec.totalCost ?? 0) as number, range: getRange(sec) });
          }
        }
      }
    }

    if (grandTotal === 0 && execBestVersionNames.size === 0) return { total: null, warnings: [], bestVersionNames: new Set<string>(), mrBestVersionNames: new Set<string>() };

    // 日付重複チェック
    const warnings: string[] = [];
    for (let i = 0; i < warningEntries.length; i++) {
      for (let j = i + 1; j < warningEntries.length; j++) {
        const a = warningEntries[i], b = warningEntries[j];
        if (!a.range.min || !a.range.max || !b.range.min || !b.range.max) continue;
        if (a.range.min <= b.range.max && b.range.min <= a.range.max) {
          warnings.push(
            `${EXEC_SECTION_LABELS[a.key] ?? a.key}（${a.versionName}: ${a.range.min}〜${a.range.max}）と` +
            `${EXEC_SECTION_LABELS[b.key] ?? b.key}（${b.versionName}: ${b.range.min}〜${b.range.max}）` +
            `の利用期間が重複しています。執行済額の計上方法を確認してください。`
          );
        }
      }
    }

    // ─── 「最新」ラベル: セクションキーごとに最大バージョン番号 ───
    const latestByKey = new Map<string, string>();
    for (const k of RC_ALL_SECTION_KEYS) {
      let bestNum = -1, bestName = '';
      for (const v of execRcVersions) {
        if (!(v.data as any)[k]) continue;
        const vNum = parseVersionNum(v.versionName);
        if (vNum > bestNum) { bestNum = vNum; bestName = v.versionName; }
      }
      if (bestName) latestByKey.set(k, bestName);
    }
    const bestVersionNames = new Set(Array.from(latestByKey.values()));

    // MR「最新」ラベル: セクションキーごとに最大バージョン番号
    const mrLatestByKey = new Map<string, string>();
    for (const k of ['asia', 'para'] as const) {
      let bestNum = -1, bestName = '';
      for (const v of execMrVersions) {
        if (!(v.data as any)[k]) continue;
        const vNum = parseVersionNum(v.versionName);
        if (vNum > bestNum) { bestNum = vNum; bestName = v.versionName; }
      }
      if (bestName) mrLatestByKey.set(k, bestName);
    }
    const mrBestVersionNames = new Set(Array.from(mrLatestByKey.values()));

    return { total: grandTotal, warnings, bestVersionNames, mrBestVersionNames };
  })();

  const executedTotal = mode === "current" && execRcComputed.total != null
    ? execRcComputed.total
    : hotel.costItems.reduce((s, i) => s + (i.executedAmount || 0), 0);
  const executionPct =
    adjustedTotals.actual > 0
      ? Math.min(100, Math.round((executedTotal / adjustedTotals.actual) * 100))
      : 0;

  const facilityNoKey = hotel?.facilityNo ? String(parseInt(hotel.facilityNo, 10)) : null;

  // ホテル名正規化（スペース除去・小文字化）
  const normalizeHotelName = (s: string) => s.replace(/[\s　]/g, "").toLowerCase();

  // Excelから読み取った施設名でホテルリストを検索（ホテルIDを返す）
  const findBestMatchHotel = (detectedName: string | null): string | null => {
    if (!detectedName) return hotel?.id ?? null;
    const nd = normalizeHotelName(detectedName);
    // 完全一致
    const exact = hotels.find(h => normalizeHotelName(h.name) === nd);
    if (exact) return exact.id;
    // 部分一致（検出名がホテル名を含む、またはその逆）
    const partial = hotels.find(h => {
      const nh = normalizeHotelName(h.name);
      return nd.includes(nh) || nh.includes(nd);
    });
    return partial?.id ?? hotel?.id ?? null;
  };

  // バージョン名をファイル名から抽出
  // 優先度: 1) 予算執行〇〇  2) yyyymmdd契約/差し替え  3) ファイル名全体
  const getVersionName = (file: File): string => {
    const base = file.name.replace(/\.(xlsx|xls)$/i, "");
    // 予算執行 + 数字（半角・全角）
    const execMatch = base.match(/予算執行[\d０-９]+/);
    if (execMatch) return execMatch[0];
    // yyyymmdd + 契約 or 差し替え（区切り文字任意）
    const contractMatch = base.match(/\d{4}[/_-]?\d{2}[/_-]?\d{2}(?:契約|差し替え)/);
    if (contractMatch) return contractMatch[0];
    return base;
  };

  // バージョン追加 or 同名更新
  function addOrUpdateVersion<T>(versions: VersionedEntry<T>[], versionName: string, data: T): VersionedEntry<T>[] {
    const newV: VersionedEntry<T> = { versionName, uploadedAt: new Date().toISOString(), data };
    const idx = versions.findIndex(v => v.versionName === versionName);
    if (idx >= 0) { const u = [...versions]; u[idx] = newV; return u; }
    return [...versions, newV];
  }

  // バージョン名から数値を抽出するヘルパー（最新デフォルト用）
  const parseVNum = (versionName: string): number => {
    const m = versionName.match(/[０-９0-9]+/);
    if (!m) return 0;
    const s = m[0].replace(/[０-９]/g, (c: string) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    return parseInt(s, 10);
  };
  // デフォルト表示: バージョン番号が最大のインデックス
  const defaultExecRcIdx = execRcVersions.length > 0
    ? execRcVersions.reduce((best, v, i) => parseVNum(v.versionName) > parseVNum(execRcVersions[best].versionName) ? i : best, 0)
    : 0;
  const defaultExecMrIdx = execMrVersions.length > 0
    ? execMrVersions.reduce((best, v, i) => parseVNum(v.versionName) > parseVNum(execMrVersions[best].versionName) ? i : best, 0)
    : 0;

  // 派生データ: 選択中バージョン（null = 最新 = バージョン番号最大）
  const execEntry = execRcVersions.length > 0 ? (execRcVersions[execRcSelectedIdx ?? defaultExecRcIdx]?.data ?? null) : null;
  const contractEntry = contractRcVersions.length > 0 ? (contractRcVersions[contractRcSelectedIdx ?? contractRcVersions.length - 1]?.data ?? null) : null;
  const execMrEntry = execMrVersions.length > 0 ? (execMrVersions[execMrSelectedIdx ?? defaultExecMrIdx]?.data ?? null) : null;
  const contractMrEntry = contractMrVersions.length > 0 ? (contractMrVersions[contractMrSelectedIdx ?? contractMrVersions.length - 1]?.data ?? null) : null;

  const handleRcUpload = async (file: File, specificSheet?: string) => {
    if (!facilityNoKey) return;
    setRcUploading(true);
    setRcUploadError(null);
    try {
      const { parseRoomChargesFromPerHotelFile } = await import("@/lib/parseRoomCharges");
      const result = await parseRoomChargesFromPerHotelFile(file, specificSheet);
      if ("error" in result) { setRcUploadError(result.error); return; }
      localStorage.setItem(`room-charges-hotel-${facilityNoKey}`, JSON.stringify(result.entry));
      setPerHotelRcEntry(result.entry);
    } catch (e) {
      setRcUploadError(e instanceof Error ? e.message : "エラー");
    } finally {
      setRcUploading(false);
    }
  };

  const handleRcFileSelect = async (file: File) => {
    const { getExcelSheetInfo } = await import("@/lib/parseRoomCharges");
    const { rcSheets } = await getExcelSheetInfo(file);
    if (rcSheets.length > 1) {
      setSheetPending({ file, rcSheets, mrSheets: [], selectedRc: rcSheets[0], selectedMr: null, action: "rc" });
    } else {
      await handleRcUpload(file, rcSheets[0]);
    }
  };

  const handleMrUpload = async (file: File, specificSheet?: string) => {
    if (!facilityNoKey) return;
    setMrUploading(true);
    setMrUploadError(null);
    try {
      const { parseMeetingRoomsFromPerHotelFile } = await import("@/lib/parseMeetingRooms");
      const result = await parseMeetingRoomsFromPerHotelFile(file, specificSheet);
      if ("error" in result) { setMrUploadError(result.error); return; }
      localStorage.setItem(`meeting-rooms-hotel-${facilityNoKey}`, JSON.stringify(result.entry));
      setPerHotelMrEntry(result.entry);
    } catch (e) {
      setMrUploadError(e instanceof Error ? e.message : "エラー");
    } finally {
      setMrUploading(false);
    }
  };

  const handleMrFileSelect = async (file: File) => {
    const { getExcelSheetInfo } = await import("@/lib/parseRoomCharges");
    const { mrSheets } = await getExcelSheetInfo(file);
    if (mrSheets.length > 1) {
      setSheetPending({ file, rcSheets: [], mrSheets, selectedRc: null, selectedMr: mrSheets[0], action: "mr" });
    } else {
      await handleMrUpload(file, mrSheets[0]);
    }
  };

  const handleMcUpload = async (file: File) => {
    if (!facilityNoKey) return;
    setMcUploading(true);
    setMcUploadError(null);
    try {
      const { parseMealCostsFromPerHotelFile } = await import("@/lib/parseMealCosts");
      const result = await parseMealCostsFromPerHotelFile(file);
      if ("error" in result) { setMcUploadError(result.error); return; }
      localStorage.setItem(`meal-costs-hotel-${facilityNoKey}`, JSON.stringify(result.entry));
      setPerHotelMcEntry(result.entry);
    } catch (e) {
      setMcUploadError(e instanceof Error ? e.message : "エラー");
    } finally {
      setMcUploading(false);
    }
  };

  const doHotelLevelUpload = async (file: File, type: "exec" | "contract", rcSheet: string | null, mrSheet: string | null) => {
    setHotelUploading(true);
    setHotelUploadError(null);
    setHotelUploadMsg(null);
    const facilityNo = hotel?.facilityNo;
    if (!facilityNo) {
      setHotelUploadError("施設番号が設定されていません。先にホテル情報を編集してください。");
      setHotelUploading(false);
      return;
    }
    try {
      let rcIncoming: RoomChargesDB[string] | null = null;
      let mrIncoming: MeetingRoomsDB[string] | null = null;
      if (rcSheet !== null) {
        try {
          const { parseRoomChargesFromPerHotelFile } = await import("@/lib/parseRoomCharges");
          const r = await parseRoomChargesFromPerHotelFile(file, rcSheet || undefined);
          if (!("error" in r)) rcIncoming = r.entry;
        } catch { /* シートなし */ }
      }
      if (mrSheet !== null) {
        try {
          const { parseMeetingRoomsFromPerHotelFile } = await import("@/lib/parseMeetingRooms");
          const r = await parseMeetingRoomsFromPerHotelFile(file, mrSheet || undefined);
          if (!("error" in r)) mrIncoming = r.entry;
        } catch { /* シートなし */ }
      }
      if (!rcIncoming && !mrIncoming) {
        setHotelUploadError("別紙1-1・別紙1-2のシートが見つかりませんでした。");
        return;
      }
      const versionName = getVersionName(file);
      const detectedName = rcIncoming?.hotelName || mrIncoming?.hotelName || null;
      const suggestedHotelId = findBestMatchHotel(detectedName);
      setMatchPending({ versionName, detectedName, suggestedHotelId, rcIncoming, mrIncoming, uploadType: type });
      setMatchSelectedHotelId(suggestedHotelId ?? hotel?.id ?? "");
    } catch (e) {
      setHotelUploadError(String(e));
    } finally {
      setHotelUploading(false);
    }
  };

  const handleHotelLevelUpload = async (file: File, type: "exec" | "contract") => {
    const { getExcelSheetInfo } = await import("@/lib/parseRoomCharges");
    const { rcSheets, mrSheets } = await getExcelSheetInfo(file);
    if (rcSheets.length > 1 || mrSheets.length > 1) {
      const action = type === "exec" ? "hotelExec" : "hotelContract";
      setSheetPending({ file, rcSheets, mrSheets, selectedRc: rcSheets[0] ?? null, selectedMr: mrSheets[0] ?? null, action });
      return;
    }
    await doHotelLevelUpload(file, type, rcSheets[0] ?? null, mrSheets[0] ?? null);
  };

  const handleCurrentUpload = async (file: File, type: "exec" | "contract", specificSheet?: string) => {
    const setter = type === "exec" ? setExecUploading : setContractUploading;
    const errSetter = type === "exec" ? setExecUploadError : setContractUploadError;
    setter(true); errSetter(null);
    try {
      const { parseRoomChargesFromPerHotelFile } = await import("@/lib/parseRoomCharges");
      const result = await parseRoomChargesFromPerHotelFile(file, specificSheet);
      if ("error" in result) { errSetter(result.error); return; }
      const versionName = getVersionName(file);
      const detectedName = result.entry.hotelName || null;
      const suggestedHotelId = findBestMatchHotel(detectedName);
      setMatchPending({ versionName, detectedName, suggestedHotelId, rcIncoming: result.entry, mrIncoming: null, uploadType: type });
      setMatchSelectedHotelId(suggestedHotelId ?? hotel?.id ?? "");
    } catch (e) {
      errSetter(String(e));
    } finally {
      setter(false);
    }
  };

  const handleCurrentFileSelect = async (file: File, type: "exec" | "contract") => {
    const { getExcelSheetInfo } = await import("@/lib/parseRoomCharges");
    const { rcSheets } = await getExcelSheetInfo(file);
    if (rcSheets.length > 1) {
      const action = type === "exec" ? "currentExec" : "currentContract";
      setSheetPending({ file, rcSheets, mrSheets: [], selectedRc: rcSheets[0], selectedMr: null, action });
    } else {
      await handleCurrentUpload(file, type, rcSheets[0]);
    }
  };

  const handleCurrentMrUpload = async (file: File, type: "exec" | "contract", specificSheet?: string) => {
    try {
      const { parseMeetingRoomsFromPerHotelFile } = await import("@/lib/parseMeetingRooms");
      const r = await parseMeetingRoomsFromPerHotelFile(file, specificSheet);
      if ("error" in r) return;
      const versionName = getVersionName(file);
      const detectedName = r.entry.hotelName || null;
      const suggestedHotelId = findBestMatchHotel(detectedName);
      setMatchPending({ versionName, detectedName, suggestedHotelId, rcIncoming: null, mrIncoming: r.entry, uploadType: type });
      setMatchSelectedHotelId(suggestedHotelId ?? hotel?.id ?? "");
    } catch { /* ignore */ }
  };

  const handleCurrentMrFileSelect = async (file: File, type: "exec" | "contract") => {
    const { getExcelSheetInfo } = await import("@/lib/parseRoomCharges");
    const { mrSheets } = await getExcelSheetInfo(file);
    if (mrSheets.length > 1) {
      const action = type === "exec" ? "currentMrExec" : "currentMrContract";
      setSheetPending({ file, rcSheets: [], mrSheets, selectedRc: null, selectedMr: mrSheets[0], action });
    } else {
      await handleCurrentMrUpload(file, type, mrSheets[0]);
    }
  };

  const handleMatchConfirm = () => {
    if (!matchPending || !matchSelectedHotelId) return;
    const { versionName, rcIncoming, mrIncoming, uploadType } = matchPending;
    const targetHotel = hotels.find(h => h.id === matchSelectedHotelId);
    if (!targetHotel?.facilityNo) return;
    const facilityNo = targetHotel.facilityNo;
    const isCurrentHotel = targetHotel.id === hotel?.id;
    const saved: string[] = [];

    if (rcIncoming) {
      const storageKey = `current-${uploadType}-rc-versions-${facilityNo}`;
      let currVersions: VersionedEntry<RoomChargesDB[string]>[] = [];
      if (isCurrentHotel) {
        currVersions = uploadType === "exec" ? execRcVersions : contractRcVersions;
      } else {
        try { const raw = localStorage.getItem(storageKey); if (raw) currVersions = JSON.parse(raw); } catch { /* ignore */ }
      }
      const newVersions = addOrUpdateVersion(currVersions, versionName, rcIncoming);
      localStorage.setItem(storageKey, JSON.stringify(newVersions));
      if (isCurrentHotel) {
        if (uploadType === "exec") { setExecRcVersions(newVersions); setExecRcSelectedIdx(null); }
        else { setContractRcVersions(newVersions); setContractRcSelectedIdx(null); }
      }
      saved.push("別紙1-1");
    }

    if (mrIncoming) {
      const storageKey = `current-${uploadType}-mr-versions-${facilityNo}`;
      let currVersions: VersionedEntry<MeetingRoomsDB[string]>[] = [];
      if (isCurrentHotel) {
        currVersions = uploadType === "exec" ? execMrVersions : contractMrVersions;
      } else {
        try { const raw = localStorage.getItem(storageKey); if (raw) currVersions = JSON.parse(raw); } catch { /* ignore */ }
      }
      const newVersions = addOrUpdateVersion(currVersions, versionName, mrIncoming);
      localStorage.setItem(storageKey, JSON.stringify(newVersions));
      if (isCurrentHotel) {
        if (uploadType === "exec") { setExecMrVersions(newVersions); setExecMrSelectedIdx(null); }
        else { setContractMrVersions(newVersions); setContractMrSelectedIdx(null); }
      }
      saved.push("別紙1-2");
    }

    setMatchPending(null);
    setHotelUploadMsg(`✓ ${targetHotel.name}（${facilityNo}）に保存 — ${saved.join("・")} / バージョン: ${versionName}`);
  };

  const handleSheetConfirm = async () => {
    if (!sheetPending) return;
    const { file, selectedRc, selectedMr, action } = sheetPending;
    setSheetPending(null);
    if (action === "rc") {
      if (selectedRc) await handleRcUpload(file, selectedRc);
    } else if (action === "mr") {
      if (selectedMr) await handleMrUpload(file, selectedMr);
    } else if (action === "hotelExec" || action === "hotelContract") {
      const type = action === "hotelExec" ? "exec" : "contract";
      await doHotelLevelUpload(file, type, selectedRc, selectedMr);
    } else if (action === "currentExec" || action === "currentContract") {
      const type = action === "currentExec" ? "exec" : "contract";
      if (selectedRc) await handleCurrentUpload(file, type, selectedRc);
    } else if (action === "currentMrExec" || action === "currentMrContract") {
      const type = action === "currentMrExec" ? "exec" : "contract";
      if (selectedMr) await handleCurrentMrUpload(file, type, selectedMr);
    }
  };

  const handleOpenAddModal = (cat?: CostCategory) => {
    setEditingItem(null);
    setModalDefaultCategory(
      cat ?? (activeCategory !== "all" ? activeCategory : undefined)
    );
    setCostModalOpen(true);
  };

  const handleOpenEditModal = (item: CostItem) => {
    setEditingItem(item);
    setModalDefaultCategory(undefined);
    setCostModalOpen(true);
  };

  const handleDelete = (itemId: string, desc: string) => {
    if (confirm(`「${desc}」を削除しますか？`)) {
      deleteCostItem(hotel.id, itemId);
    }
  };

  const handleSubmit = (data: Omit<CostItem, "id">) => {
    if (editingItem) {
      updateCostItem(hotel.id, editingItem.id, data);
    } else {
      addCostItem(hotel.id, data);
    }
    setCostModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 flex-shrink-0 transition-colors"
          >
            ← 戻る
          </button>
          <span className="text-gray-200 flex-shrink-0 select-none">|</span>
          <Link
            href={`/?mode=${mode}`}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 flex-shrink-0 transition-colors"
          >
            メイン画面
          </Link>
          <span className="text-gray-300 flex-shrink-0 select-none">/</span>
          {/* Hotel switcher dropdown */}
          <div className="flex items-center gap-2 flex-1 min-w-0 relative" ref={dropdownRef}>
            <button
              onClick={() => { setHotelDropdownOpen((v) => !v); setHotelSearchQuery(""); }}
              className="flex items-center gap-2 min-w-0 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors max-w-full"
              title="ホテルを切り替え"
            >
              {hotel.facilityNo && (
                <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex-shrink-0">
                  {hotel.facilityNo}
                </span>
              )}
              <h1 className="font-bold text-gray-900 truncate text-base sm:text-lg">
                {hotel.name}
              </h1>
              {hotel.contractStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${CONTRACT_STATUS_COLORS[hotel.contractStatus]}`}>
                  {hotel.contractStatus}
                </span>
              )}
              <span className="text-gray-400 text-xs flex-shrink-0">▼</span>
            </button>

            {hotelDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="p-2 border-b border-gray-100">
                  <input
                    autoFocus
                    type="text"
                    value={hotelSearchQuery}
                    onChange={(e) => setHotelSearchQuery(e.target.value)}
                    placeholder="ホテル名・施設番号で検索..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="overflow-y-auto max-h-64">
                  {filteredHotelsForDropdown.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">見つかりません</div>
                  ) : (
                    filteredHotelsForDropdown.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          router.push(`/hotels/detail?id=${h.id}&mode=${mode}`);
                          setHotelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${h.id === id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                      >
                        {h.facilityNo && (
                          <span className="font-mono text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">
                            {h.facilityNo}
                          </span>
                        )}
                        <span className="truncate">{h.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <Link
            href={`/admin?mode=${mode}`}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white flex items-center gap-1.5 flex-shrink-0 transition-colors"
          >
            <span>⚙</span>
            <span className="hidden sm:inline">管理画面</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* 提供客室 / 保有客室 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-xl">🏨</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">提供客室 / 保有客室</div>
              <div className="tabular-nums font-bold text-lg text-blue-600">
                {hotel.offeredRooms ?? "—"}
                <span className="text-gray-400 font-normal text-sm mx-1">/</span>
                <span className="text-gray-700">{hotel.totalRooms ?? "—"}</span>
              </div>
            </div>
          </div>
          {/* 予算総額 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 text-xl">💴</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">予算総額</div>
              <div className="text-base font-bold text-gray-800 tabular-nums">{formatCurrency(totals.budget)}</div>
            </div>
          </div>
          {/* 実績額 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0 text-xl">📊</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">実績額</div>
              <div className="text-base font-bold text-gray-800 tabular-nums">{formatCurrency(adjustedTotals.actual)}</div>
            </div>
          </div>
          {/* 予実乖離 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 text-xl">📉</div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">予実乖離</div>
              <div className={`text-base font-bold tabular-nums ${variance.className}`}>{variance.text}</div>
            </div>
          </div>
          {/* 執行済額 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-xl">✅</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">執行済額</div>
              <div className="text-base font-bold text-gray-800 tabular-nums">{formatCurrency(executedTotal)}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${executionPct}%` }} />
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{executionPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 利用期間重複警告 */}
        {mode === "current" && execRcComputed.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <span>⚠</span>
              <span>利用期間の重複を検出 — 執行済額の計上方法を確認してください</span>
            </div>
            {execRcComputed.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700 pl-5">{w}</p>
            ))}
          </div>
        )}

        {/* ── Accordion: 施設情報 ＋ ファンクションルーム ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {/* 施設情報 */}
          <div>
            <button
              onClick={() => setFacilityInfoOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm transition-transform duration-200" style={{ display: "inline-block", transform: facilityInfoOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                <span className="text-sm font-semibold text-gray-700">施設情報</span>
                {hotel.contractStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_STATUS_COLORS[hotel.contractStatus]}`}>{hotel.contractStatus}</span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setHotelEditOpen(true); }}
                className="text-xs text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                title="施設情報を編集"
              >
                ✏️
              </button>
            </button>
            {facilityInfoOpen && (
              <div className="px-5 pb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {hotel.location && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 flex-shrink-0">📍</span>
                      <span className="text-gray-700">{hotel.location}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-gray-400 flex-shrink-0">📅</span>
                    <span className="text-gray-700">{formatDateRange(hotel.contractStartDate, hotel.contractEndDate)}</span>
                  </div>
                  {hotel.facilityNo && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 flex-shrink-0">🔢</span>
                      <span className="font-mono text-gray-700">施設番号: {hotel.facilityNo}</span>
                    </div>
                  )}
                </div>
                {hotel.groups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hotel.groups.map((g) => (
                      <span key={g} className={`text-xs px-2 py-0.5 rounded-full ${GROUP_COLORS[g]}`}>{g}</span>
                    ))}
                  </div>
                )}
                {hotel.roomTypes.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">客室タイプ</div>
                    <div className="flex flex-wrap gap-2">
                      {hotel.roomTypes.map((r) => (
                        <span key={r.id} className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                          🛏 {r.typeName} × {r.contractQuantity}室
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {hotel.notes && (
                  <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 leading-relaxed">
                    📝 {hotel.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ファンクションルーム */}
          <div>
            <button
              onClick={() => setFunctionRoomOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm transition-transform duration-200" style={{ display: "inline-block", transform: functionRoomOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                <span className="text-sm font-semibold text-gray-700">ファンクションルーム</span>
                <span className="text-xs text-gray-500">
                  保有: {hotel.totalFunctionRooms ?? "—"} / 提供: {hotel.offeredFunctionRooms ?? "—"}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setHotelEditOpen(true); }}
                className="text-xs text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                title="ファンクションルーム情報を編集"
              >
                ✏️
              </button>
            </button>
            {functionRoomOpen && (
              <div className="px-5 pb-4">
                <div className="grid grid-cols-2 gap-4 max-w-xs">
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                    <div className="text-xs text-purple-500 mb-1">保有室数</div>
                    <div className="text-2xl font-bold text-purple-700 tabular-nums">{hotel.totalFunctionRooms ?? "—"}</div>
                    {hotel.totalFunctionRooms != null && <div className="text-xs text-purple-400">室</div>}
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                    <div className="text-xs text-blue-500 mb-1">提供室数</div>
                    <div className="text-2xl font-bold text-blue-700 tabular-nums">{hotel.offeredFunctionRooms ?? "—"}</div>
                    {hotel.offeredFunctionRooms != null && <div className="text-xs text-blue-400">室</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* ── Category tabs + content ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Tab nav */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex px-4 sm:px-5 min-w-max">
              <TabBtn
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
              >
                すべて
                <CountBadge
                  count={hotel.costItems.length}
                  active={activeCategory === "all"}
                />
              </TabBtn>
              {COST_CATEGORIES.map((cat) => {
                const count = categoryStats[cat].items.length;
                return (
                  <TabBtn
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                    {count > 0 && (
                      <CountBadge
                        count={count}
                        active={activeCategory === cat}
                      />
                    )}
                  </TabBtn>
                );
              })}
            </div>
          </div>

          {/* ホテル単位アップロード（現状金額モード専用） */}
          {mode === "current" && (
            <div className="mx-4 sm:mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">ホテル単位アップロード</span>
              <span className="text-xs text-gray-500">別紙1-1・1-2が同一ファイルの場合はこちらから一括登録できます</span>
              <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors ${hotelUploading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                {hotelUploading ? "処理中..." : "↑ 予算執行額"}
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={hotelUploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleHotelLevelUpload(f, "exec"); e.target.value = ""; }} />
              </label>
              <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors ${hotelUploading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
                {hotelUploading ? "処理中..." : "↑ 契約額"}
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={hotelUploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleHotelLevelUpload(f, "contract"); e.target.value = ""; }} />
              </label>
              {hotelUploadError && <span className="text-xs text-red-500">{hotelUploadError}</span>}
              {hotelUploadMsg && <span className="text-xs text-green-600">{hotelUploadMsg}</span>}
            </div>
          )}

          {/* Content */}
          <div className="p-4 sm:p-5">
            {activeCategory === "all" ? (
              <AllCategoriesView
                categoryStats={categoryStats}
                allItems={hotel.costItems}
                onAdd={handleOpenAddModal}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
              />
            ) : (
              <>
                {activeCategory === "客室確保費" && (
                  <>
                    {mode === "current" ? (
                      <CurrentModeExecContractTabs
                        tab={rcSubTab} setTab={setRcSubTab}
                        execContent={
                          <div>
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <span className="text-xs text-gray-500">個別アップロード（別紙1-1）</span>
                              <label className={`cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded ${execUploading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                                {execUploading ? "処理中..." : "↑ 予算執行額"}
                                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={execUploading}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCurrentFileSelect(f, "exec"); e.target.value = ""; }} />
                              </label>
                              {execUploadError && <span className="text-xs text-red-500">{execUploadError}</span>}
                              {execRcVersions.length > 0 && (
                                <select
                                  value={execRcSelectedIdx ?? defaultExecRcIdx}
                                  onChange={e => setExecRcSelectedIdx(Number(e.target.value))}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700"
                                >
                                  {execRcVersions.map((v, i) => (
                                    <option key={v.versionName} value={i}>
                                      {v.versionName}{execRcComputed.bestVersionNames.has(v.versionName) ? "（最新）" : ""}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {execEntry ? <RoomChargeInTab chargeData={execEntry} /> : <p className="text-sm text-gray-400">データなし</p>}
                          </div>
                        }
                        contractContent={
                          <div>
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <span className="text-xs text-gray-500">個別アップロード（別紙1-1）</span>
                              <label className={`cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded ${contractUploading ? "bg-green-400" : "bg-green-600 hover:bg-green-700"}`}>
                                {contractUploading ? "処理中..." : "↑ 契約額"}
                                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={contractUploading}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCurrentFileSelect(f, "contract"); e.target.value = ""; }} />
                              </label>
                              {contractUploadError && <span className="text-xs text-red-500">{contractUploadError}</span>}
                              {contractRcVersions.length > 0 && (
                                <select
                                  value={contractRcSelectedIdx ?? contractRcVersions.length - 1}
                                  onChange={e => setContractRcSelectedIdx(Number(e.target.value))}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700"
                                >
                                  {contractRcVersions.map((v, i) => (
                                    <option key={v.versionName} value={i}>
                                      {v.versionName}{i === contractRcVersions.length - 1 ? "（最新）" : ""}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {contractEntry ? <RoomChargeInTab chargeData={contractEntry} /> : <p className="text-sm text-gray-400">データなし</p>}
                          </div>
                        }
                        diffContent={<CurrentModeDiffView execEntry={execEntry} contractEntry={contractEntry} />}
                      />
                    ) : (
                      <>
                        <UploadButton
                          label="別紙1-1 Excelアップロード"
                          onFile={handleRcFileSelect}
                          uploading={rcUploading}
                          uploadError={rcUploadError}
                          uploadSuccess={perHotelRcEntry != null}
                        />
                        <RoomChargeInTab chargeData={roomChargeData} />
                      </>
                    )}
                  </>
                )}
                {activeCategory === "会議室等確保費" && (
                  <>
                    {mode === "current" ? (
                      <CurrentModeExecContractTabs
                        tab={mrSubTab} setTab={setMrSubTab}
                        execContent={
                          <div>
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <span className="text-xs text-gray-500">個別アップロード（別紙1-2）</span>
                              <label className={`cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700`}>
                                ↑ 予算執行額
                                <input type="file" accept=".xlsx,.xls" className="hidden"
                                  onChange={async e => {
                                    const f = e.target.files?.[0]; if (!f) return;
                                    await handleCurrentMrFileSelect(f, "exec");
                                    e.target.value = "";
                                  }} />
                              </label>
                              {execMrVersions.length > 0 && (
                                <select
                                  value={execMrSelectedIdx ?? defaultExecMrIdx}
                                  onChange={e => setExecMrSelectedIdx(Number(e.target.value))}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700"
                                >
                                  {execMrVersions.map((v, i) => (
                                    <option key={v.versionName} value={i}>
                                      {v.versionName}{execRcComputed.mrBestVersionNames.has(v.versionName) ? "（最新）" : ""}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {execMrEntry ? <MeetingRoomInTab meetingData={execMrEntry} /> : <p className="text-sm text-gray-400">データなし</p>}
                          </div>
                        }
                        contractContent={
                          <div>
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <span className="text-xs text-gray-500">個別アップロード（別紙1-2）</span>
                              <label className={`cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700`}>
                                ↑ 契約額
                                <input type="file" accept=".xlsx,.xls" className="hidden"
                                  onChange={async e => {
                                    const f = e.target.files?.[0]; if (!f) return;
                                    await handleCurrentMrFileSelect(f, "contract");
                                    e.target.value = "";
                                  }} />
                              </label>
                              {contractMrVersions.length > 0 && (
                                <select
                                  value={contractMrSelectedIdx ?? contractMrVersions.length - 1}
                                  onChange={e => setContractMrSelectedIdx(Number(e.target.value))}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700"
                                >
                                  {contractMrVersions.map((v, i) => (
                                    <option key={v.versionName} value={i}>
                                      {v.versionName}{i === contractMrVersions.length - 1 ? "（最新）" : ""}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {contractMrEntry ? <MeetingRoomInTab meetingData={contractMrEntry} /> : <p className="text-sm text-gray-400">データなし</p>}
                          </div>
                        }
                        diffContent={<CurrentModeMrDiffView execEntry={execMrEntry} contractEntry={contractMrEntry} />}
                      />
                    ) : (
                      <>
                        <UploadButton
                          label="別紙1-2 Excelアップロード"
                          onFile={handleMrFileSelect}
                          uploading={mrUploading}
                          uploadError={mrUploadError}
                          uploadSuccess={perHotelMrEntry != null}
                        />
                        <MeetingRoomInTab meetingData={meetingRoomData} />
                      </>
                    )}
                  </>
                )}
                {activeCategory === "飲食費" && (
                  <>
                    {mode === "current" ? (
                      <CurrentModeExecContractTabs
                        tab={otherSubTab} setTab={setOtherSubTab} hideDiff
                        execContent={<p className="text-sm text-gray-400 py-4">飲食費の執行額フォーマットは未設定です。次のステップで形式を指定してアップロードできるようになります。</p>}
                        contractContent={<p className="text-sm text-gray-400 py-4">飲食費の契約額フォーマットは未設定です。次のステップで形式を指定してアップロードできるようになります。</p>}
                        diffContent={null}
                      />
                    ) : (
                      <>
                        <UploadButton
                          label="別紙2 Excelアップロード"
                          onFile={handleMcUpload}
                          uploading={mcUploading}
                          uploadError={mcUploadError}
                          uploadSuccess={perHotelMcEntry != null}
                        />
                        <MealCostInTab mealData={mealCostData} />
                      </>
                    )}
                  </>
                )}
                <SingleCategoryView
                  stats={categoryStats[activeCategory]}
                  onAdd={() => handleOpenAddModal(activeCategory)}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDelete}
                  showAdd={
                    !(activeCategory === "客室確保費" && roomChargeActual != null) &&
                    !(activeCategory === "会議室等確保費" && meetingRoomActual != null)
                  }
                />
              </>
            )}
          </div>
        </div>
      </main>

      {costModalOpen && (
        <CostItemModal
          item={editingItem}
          defaultCategory={modalDefaultCategory}
          onSubmit={handleSubmit}
          onClose={() => setCostModalOpen(false)}
        />
      )}

      {hotelEditOpen && hotel && (
        <HotelFormModal
          hotel={hotel}
          onSubmit={(data) => {
            updateHotel(hotel.id, data);
            setHotelEditOpen(false);
          }}
          onClose={() => setHotelEditOpen(false)}
        />
      )}

      {/* 施設自動マッチングダイアログ */}
      {matchPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setMatchPending(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">保存先の施設を確認してください</h3>
              <p className="text-xs text-gray-400 mt-0.5">バージョン: {matchPending.versionName} / {matchPending.uploadType === "exec" ? "予算執行額" : "契約額"}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              {matchPending.detectedName && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="text-xs text-blue-500 mb-0.5">Excelファイル内の施設名</div>
                  <div className="text-sm font-semibold text-blue-800">{matchPending.detectedName}</div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">保存先ホテル</label>
                <select
                  value={matchSelectedHotelId}
                  onChange={e => setMatchSelectedHotelId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {hotels.filter(h => h.facilityNo).sort((a, b) => (a.facilityNo ?? "").localeCompare(b.facilityNo ?? "")).map(h => (
                    <option key={h.id} value={h.id}>
                      {h.facilityNo} — {h.name}
                      {h.id === matchPending.suggestedHotelId ? " ★" : ""}
                    </option>
                  ))}
                </select>
                {matchPending.suggestedHotelId && matchPending.suggestedHotelId !== matchSelectedHotelId && (
                  <p className="text-xs text-amber-600 mt-1">
                    ★ 自動マッチング候補: {hotels.find(h => h.id === matchPending.suggestedHotelId)?.name}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {matchPending.rcIncoming && <span className="mr-2">別紙1-1（客室確保費）</span>}
                {matchPending.mrIncoming && <span>別紙1-2（会議室等確保費）</span>}
                を保存します
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setMatchPending(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">キャンセル</button>
              <button
                onClick={handleMatchConfirm}
                disabled={!matchSelectedHotelId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40"
              >
                この施設に保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* シート選択ダイアログ */}
      {sheetPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSheetPending(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-1">読み込むシートを選択してください</h3>
            <p className="text-xs text-gray-400 mb-5 truncate">{sheetPending.file.name}</p>
            {sheetPending.rcSheets.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">別紙1-1（客室確保費）</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  value={sheetPending.selectedRc ?? "__skip__"}
                  onChange={e => setSheetPending(prev => prev ? { ...prev, selectedRc: e.target.value === "__skip__" ? null : e.target.value } : null)}
                >
                  {sheetPending.rcSheets.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__skip__">読み込まない</option>
                </select>
              </div>
            )}
            {sheetPending.mrSheets.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">別紙1-2（会議室等確保費）</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  value={sheetPending.selectedMr ?? "__skip__"}
                  onChange={e => setSheetPending(prev => prev ? { ...prev, selectedMr: e.target.value === "__skip__" ? null : e.target.value } : null)}
                >
                  {sheetPending.mrSheets.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__skip__">読み込まない</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setSheetPending(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleSheetConfirm} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">取り込む</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
