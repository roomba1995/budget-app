"use client";

import { useMemo } from "react";
import { Hotel, formatCurrency } from "@/types";
import type { AllocationDB } from "@/lib/parseBudgetAllocation";
import type { RoomChargesDB } from "@/lib/parseRoomCharges";
import type { MeetingRoomsDB } from "@/lib/parseMeetingRooms";

interface Props {
  hotels: Hotel[];
  allocationDb?: AllocationDB | null;
  roomChargeDb?: RoomChargesDB | null;
  meetingRoomDb?: MeetingRoomsDB | null;
}

const NAGOYA_TOKYU_NO = "121";
const GRAND_TIARA_NO  = "221";

function normFacilityNo(raw: string | undefined | null): string {
  if (!raw) return "";
  const n = parseInt(raw, 10);
  return isNaN(n) ? raw : String(n);
}

interface RowData {
  label: string;
  roomTotal: number | null;
  funcTotal: number | null;
  mealTotal: number | null;
  businessComp: number | null;
  cleanVenueMachine: number | null;
  cleanVenueTenant: number | null;
  laundry: number | null;
  total: number | null;
  colorClass: string;
}

// Hardcoded Excel values from 財政見通し積算 (全SH全項目統合版）
// Rows 27-30 (アジア ファミリー/技術役員/スポンサー/メディア) and 32-35 (パラ ファミリー/技術役員/スポンサー/メディア)
const EXCEL_ROWS: Record<string, Omit<RowData, "label" | "colorClass">> = {
  "アジアファミリー":  { roomTotal: 2204156998,    funcTotal: 1133891586,   mealTotal: 453261666,  businessComp: 35875904.9, cleanVenueMachine: null, cleanVenueTenant: null, laundry: 74703200,  total: 3901889354.9 },
  "アジア技術役員":   { roomTotal: 1724607631,    funcTotal: 760304013.7,  mealTotal: 726706750,  businessComp: 0,          cleanVenueMachine: null, cleanVenueTenant: null, laundry: null,      total: 3211618394.7 },
  "アジアスポンサー": { roomTotal: 1285487677.08, funcTotal: 0,            mealTotal: 0,          businessComp: 0,          cleanVenueMachine: null, cleanVenueTenant: null, laundry: null,      total: 1285487677.08 },
  "アジアメディア":   { roomTotal: 2656553304,    funcTotal: 0,            mealTotal: 0,          businessComp: 0,          cleanVenueMachine: null, cleanVenueTenant: null, laundry: null,      total: 2656553304 },
  "パラファミリー":   { roomTotal: 472117800,     funcTotal: 288657600,    mealTotal: 72406400,   businessComp: 792000,     cleanVenueMachine: null, cleanVenueTenant: null, laundry: 20944000,  total: 854917800 },
  "パラ技術役員":    { roomTotal: 344907436,     funcTotal: 367732929.1,  mealTotal: 195448750,  businessComp: 0,          cleanVenueMachine: null, cleanVenueTenant: null, laundry: null,      total: 908089115.1 },
  "パラスポンサー":  { roomTotal: 837038639.34,  funcTotal: 0,            mealTotal: 0,          businessComp: 0,          cleanVenueMachine: null, cleanVenueTenant: null, laundry: null,      total: 837038639.34 },
  "パラメディア":    { roomTotal: 402289600.8,   funcTotal: 0,            mealTotal: 0,          businessComp: 0,          cleanVenueMachine: null, cleanVenueTenant: null, laundry: null,      total: 402289600.8 },
};

function calcAthleteGroup(
  hotels: Hotel[],
  groupName: string,
  event: "asia" | "para",
  allocationDb: AllocationDB | null | undefined,
  roomChargeDb: RoomChargesDB | null | undefined,
  meetingRoomDb: MeetingRoomsDB | null | undefined,
): Omit<RowData, "label" | "colorClass"> {
  const groupHotels = hotels.filter((h) => h.groups.includes(groupName as never));

  let roomTotal = 0;
  let funcTotal = 0;
  let mealTotal = 0;
  let businessComp = 0;
  let cleanVenueMachine = 0;
  let cleanVenueTenant = 0;

  for (const h of groupHotels) {
    const facilityNoKey = normFacilityNo(h.facilityNo);
    const allocEntry = facilityNoKey ? allocationDb?.[facilityNoKey] : null;
    const rcEntry    = facilityNoKey ? roomChargeDb?.[facilityNoKey]  : null;
    const mrEntry    = facilityNoKey ? meetingRoomDb?.[facilityNoKey] : null;
    const sec = allocEntry ? (event === "asia" ? allocEntry.asia : allocEntry.para) : null;

    let roomActualExcel: number | null = null;
    let funcActualExcel: number | null = null;
    if (sec) {
      roomActualExcel = sec.roomTotal;
      funcActualExcel = sec.funcTotal;
    } else if (!allocationDb) {
      const rcSec = rcEntry ? (event === "asia" ? rcEntry.asia : rcEntry.para) : null;
      const mrSec = mrEntry ? (event === "asia" ? mrEntry.asia : mrEntry.para) : null;
      if (rcSec) roomActualExcel = rcSec.totalCostTax ?? rcSec.totalCost ?? null;
      if (mrSec) funcActualExcel = mrSec.totalCostTax ?? mrSec.totalCost ?? null;
    }

    const rc = (h.costItems ?? []).filter((i) => i.category === "客室確保費");
    const fc = (h.costItems ?? []).filter((i) => i.category === "会議室等確保費");
    const roomBudget = rc.reduce((s, i) => s + i.budgetAmount, 0);
    const funcBudget = fc.reduce((s, i) => s + i.budgetAmount, 0);

    const roomVal   = roomActualExcel ?? roomBudget;
    const funcVal   = funcActualExcel ?? funcBudget;
    const bathTax   = sec?.bathTax ?? 0;
    const breakfast = sec?.mealBreakfastAddon ?? 0;
    const bizComp   = sec?.businessComp ?? 0;
    const cvMachine = sec?.cleanVenueMachine ?? 0;
    const cvTenant  = sec?.cleanVenueTenant ?? 0;

    const isSpecial = facilityNoKey === NAGOYA_TOKYU_NO || facilityNoKey === GRAND_TIARA_NO;

    // C列: 客室金額合計 = 客室確保費合計 + 入湯税・宿泊税 + (特定ホテルの朝食加算)
    roomTotal += roomVal + bathTax + (isSpecial ? breakfast : 0);

    // D列: ファンクション金額合計 = 会議室等確保費合計のみ（キャンセルポリシーは含まない）
    funcTotal += funcVal;

    // E列: 食費合計 = 朝食加算 (特定ホテル除く)
    mealTotal += isSpecial ? 0 : breakfast;

    // F列: 営業補償等
    businessComp += bizComp;

    // G列: クリーンベニュー 自販機
    cleanVenueMachine += cvMachine;

    // H列: クリーンベニュー テナント
    cleanVenueTenant += cvTenant;
  }

  const total = roomTotal + funcTotal + mealTotal + businessComp + cleanVenueMachine + cleanVenueTenant;

  return {
    roomTotal: roomTotal || null,
    funcTotal: funcTotal || null,
    mealTotal: mealTotal || null,
    businessComp: businessComp > 0 ? businessComp : null,
    cleanVenueMachine: cleanVenueMachine > 0 ? cleanVenueMachine : null,
    cleanVenueTenant: cleanVenueTenant > 0 ? cleanVenueTenant : null,
    laundry: null,
    total: total > 0 ? total : null,
  };
}

function yen(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  return formatCurrency(v);
}

export default function BudgetForecastView({ hotels, allocationDb, roomChargeDb, meetingRoomDb }: Props) {
  const asiaAthlete = useMemo(
    () => calcAthleteGroup(hotels, "アジア選手団", "asia", allocationDb, roomChargeDb, meetingRoomDb),
    [hotels, allocationDb, roomChargeDb, meetingRoomDb]
  );
  const paraAthlete = useMemo(
    () => calcAthleteGroup(hotels, "パラ選手団", "para", allocationDb, roomChargeDb, meetingRoomDb),
    [hotels, allocationDb, roomChargeDb, meetingRoomDb]
  );

  const rows: RowData[] = [
    { label: "アジア　選手",     ...asiaAthlete,                        colorClass: "bg-orange-50" },
    { label: "アジア　ファミリー", ...EXCEL_ROWS["アジアファミリー"],  colorClass: "bg-orange-50/40" },
    { label: "アジア　技術役員",  ...EXCEL_ROWS["アジア技術役員"],   colorClass: "bg-orange-50/40" },
    { label: "アジア　スポンサー", ...EXCEL_ROWS["アジアスポンサー"], colorClass: "bg-orange-50/40" },
    { label: "アジア　メディア",  ...EXCEL_ROWS["アジアメディア"],   colorClass: "bg-orange-50/40" },
    { label: "パラ　選手",       ...paraAthlete,                         colorClass: "bg-sky-50" },
    { label: "パラ　ファミリー",  ...EXCEL_ROWS["パラファミリー"],   colorClass: "bg-sky-50/40" },
    { label: "パラ　技術役員",   ...EXCEL_ROWS["パラ技術役員"],    colorClass: "bg-sky-50/40" },
    { label: "パラ　スポンサー",  ...EXCEL_ROWS["パラスポンサー"],  colorClass: "bg-sky-50/40" },
    { label: "パラ　メディア",   ...EXCEL_ROWS["パラメディア"],    colorClass: "bg-sky-50/40" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">財政見通し積算 (全SH全項目統合版）</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          アジア・パラ選手団の値は積算シートから自動集計。その他グループはエクセル参照値。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <th className="text-left py-3 px-4 font-medium w-40">ステークホルダー</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">客室金額合計</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">ファンクション<br/>金額合計</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">食費合計<br/>(アスリートミール差額)</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">その他<br/>(営業補償等)</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">その他<br/>(自販機)</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">その他<br/>(テナント)</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">ランドリー<br/>サービス費</th>
              <th className="text-right py-3 px-4 font-medium whitespace-nowrap">合計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className={`border-b border-gray-50 ${row.colorClass}`}>
                <td className="py-2.5 px-4 font-medium text-gray-700 whitespace-nowrap">{row.label}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{yen(row.roomTotal)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{yen(row.funcTotal)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{yen(row.mealTotal)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{yen(row.businessComp)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{yen(row.cleanVenueMachine)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{yen(row.cleanVenueTenant)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-500">{yen(row.laundry)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-gray-900">{yen(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
              <td className="py-3 px-4 text-gray-700">小計</td>
              {(["roomTotal","funcTotal","mealTotal","businessComp","cleanVenueMachine","cleanVenueTenant","laundry"] as const).map((key, i) => (
                <td key={key} className="py-3 px-3 text-right tabular-nums text-gray-900">
                  {yen(rows.reduce((s, r) => s + (r[key] ?? 0), 0) || null)}
                </td>
              ))}
              <td className="py-3 px-4 text-right tabular-nums text-gray-900">
                {yen(rows.reduce((s, r) => s + (r.total ?? 0), 0) || null)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
