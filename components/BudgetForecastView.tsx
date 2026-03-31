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

// Hotel facilityNo for special breakfast-addon treatment
const NAGOYA_TOKYU_NO = "121";       // 名古屋東急ホテル
const GRAND_TIARA_NO  = "221";       // ホテルグランドティアラ南名古屋

function normFacilityNo(raw: string | undefined | null): string {
  if (!raw) return "";
  const n = parseInt(raw, 10);
  return isNaN(n) ? raw : String(n);
}

interface RowCalc {
  roomTotal: number | null;
  funcTotal: number | null;
  mealTotal: number | null;
  businessComp: number | null;
  cleanVenueMachine: number | null;
  cleanVenueTenant: number | null;
  total: number | null;
}

function calcGroup(
  hotels: Hotel[],
  groupName: string,
  event: "asia" | "para",
  allocationDb: AllocationDB | null | undefined,
  roomChargeDb: RoomChargesDB | null | undefined,
  meetingRoomDb: MeetingRoomsDB | null | undefined,
): RowCalc {
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

    // 客室確保費合計 (prefer allocationDb roomTotal, else roomChargeDb)
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
    const cancel    = sec?.cancelPolicyAmount ?? 0;
    const bizComp   = sec?.businessComp ?? 0;
    const cvMachine = sec?.cleanVenueMachine ?? 0;
    const cvTenant  = sec?.cleanVenueTenant ?? 0;

    // Special hotels: breakfast addon goes into 客室金額 instead of 食費
    const isSpecial = facilityNoKey === NAGOYA_TOKYU_NO || facilityNoKey === GRAND_TIARA_NO;

    // C列: 客室金額合計 = 客室確保費合計 + 入湯税・宿泊税 + (特定ホテルの朝食加算)
    roomTotal += roomVal + bathTax + (isSpecial ? breakfast : 0);

    // D列: ファンクション金額合計 = 会議室等確保費合計 + キャンセルポリシー
    funcTotal += funcVal + cancel;

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
    roomTotal,
    funcTotal,
    mealTotal,
    businessComp: businessComp > 0 ? businessComp : null,
    cleanVenueMachine: cleanVenueMachine > 0 ? cleanVenueMachine : null,
    cleanVenueTenant: cleanVenueTenant > 0 ? cleanVenueTenant : null,
    total: total > 0 ? total : null,
  };
}

function yen(v: number | null): string {
  if (v == null || v === 0) return "—";
  return formatCurrency(v);
}

interface TableRow {
  label: string;
  groupName?: string;
  event?: "asia" | "para";
  isHeader?: boolean;
  isSeparator?: boolean;
  colorClass?: string;
}

const TABLE_ROWS: TableRow[] = [
  { label: "アジア　選手",    groupName: "アジア選手団",   event: "asia", colorClass: "bg-orange-50" },
  { label: "アジア　ファミリー", groupName: "アジアファミリー", event: "asia", colorClass: "bg-orange-50/50" },
  { label: "アジア　技術役員", groupName: "アジア技術役員",  event: "asia", colorClass: "bg-orange-50/50" },
  { label: "アジア　スポンサー", groupName: "アジアスポンサー", event: "asia", colorClass: "bg-orange-50/50" },
  { label: "アジア　メディア", groupName: "アジアメディア",  event: "asia", colorClass: "bg-orange-50/50" },
  { label: "パラ　選手",     groupName: "パラ選手団",    event: "para", colorClass: "bg-sky-50" },
  { label: "パラ　ファミリー",  groupName: "パラファミリー",  event: "para", colorClass: "bg-sky-50/50" },
  { label: "パラ　技術役員",  groupName: "パラ技術役員",   event: "para", colorClass: "bg-sky-50/50" },
  { label: "パラ　スポンサー", groupName: "パラスポンサー",  event: "para", colorClass: "bg-sky-50/50" },
  { label: "パラ　メディア",  groupName: "パラメディア",   event: "para", colorClass: "bg-sky-50/50" },
];

export default function BudgetForecastView({ hotels, allocationDb, roomChargeDb, meetingRoomDb }: Props) {
  const calcResults = useMemo(() => {
    return TABLE_ROWS.map((row) => {
      if (!row.groupName || !row.event) return null;
      return calcGroup(hotels, row.groupName, row.event, allocationDb, roomChargeDb, meetingRoomDb);
    });
  }, [hotels, allocationDb, roomChargeDb, meetingRoomDb]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">財政見通し積算 (全SH全項目統合版）</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          アジア・パラ選手団の値は積算シートから自動集計。その他グループは参考値。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <th className="text-left py-3 px-4 font-medium w-40">ステークホルダー</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">客室金額合計</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">ファンクション<br/>金額合計</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">食費合計<br/>(アスリートミール差額)</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">その他<br/>(営業補償等)</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">その他<br/>(自販機)</th>
              <th className="text-right py-3 px-3 font-medium whitespace-nowrap">その他<br/>(テナント)</th>
              <th className="text-right py-3 px-4 font-medium whitespace-nowrap">合計</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => {
              const calc = calcResults[i];
              const hasData = calc !== null && (calc.roomTotal !== null || calc.funcTotal !== null);
              return (
                <tr key={row.label} className={`border-b border-gray-50 ${row.colorClass ?? ""}`}>
                  <td className="py-2.5 px-4 font-medium text-gray-700 whitespace-nowrap">{row.label}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{hasData ? yen(calc!.roomTotal) : "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{hasData ? yen(calc!.funcTotal) : "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{hasData ? yen(calc!.mealTotal) : "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{hasData ? yen(calc!.businessComp) : "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{hasData ? yen(calc!.cleanVenueMachine) : "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{hasData ? yen(calc!.cleanVenueTenant) : "—"}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-gray-900">{hasData ? yen(calc!.total) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
              <td className="py-3 px-4 text-gray-700">小計</td>
              {[
                calcResults.reduce((s, r) => s + (r?.roomTotal ?? 0), 0),
                calcResults.reduce((s, r) => s + (r?.funcTotal ?? 0), 0),
                calcResults.reduce((s, r) => s + (r?.mealTotal ?? 0), 0),
                calcResults.reduce((s, r) => s + (r?.businessComp ?? 0), 0),
                calcResults.reduce((s, r) => s + (r?.cleanVenueMachine ?? 0), 0),
                calcResults.reduce((s, r) => s + (r?.cleanVenueTenant ?? 0), 0),
              ].map((v, i) => (
                <td key={i} className={`py-3 ${i === 5 ? "px-4" : "px-3"} text-right tabular-nums text-gray-900`}>{yen(v > 0 ? v : null)}</td>
              ))}
              <td className="py-3 px-4 text-right tabular-nums text-gray-900">
                {yen(calcResults.reduce((s, r) => s + (r?.total ?? 0), 0) || null)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
