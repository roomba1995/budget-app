"use client";
import { Fragment, useState } from "react";

const fmt = (v: number | null | undefined): string => {
  if (v == null || v === 0) return "—";
  return `¥${Math.round(v).toLocaleString()}`;
};

interface SubRow {
  label: string;
  asia: number | null;
  para: number | null;
  total: number | null;
  breakdown?: boolean; // 上位行に含まれる内訳（参考表示）
}

interface Category {
  label: string;
  indicatedAmount: number;
  asiaTotal: number;
  paraTotal: number;
  total: number;
  subRows: SubRow[];
  hasDetail?: boolean; // 宿泊確保費積算タブに詳細あり
}

const CATEGORIES: Category[] = [
  {
    label: "客室確保費（朝食付）",
    indicatedAmount: 16_230_405_965,
    asiaTotal: 11_684_647_267,
    paraTotal: 4_686_901_810,
    total: 16_371_549_077,
    hasDetail: true,
    subRows: [
      { label: "ホテル（選手団）", asia: 3_813_841_657, para: 2_630_548_334, total: 6_444_389_991 },
      { label: "ホテル（選手団以外）", asia: 7_870_805_610, para: 2_056_353_476, total: 9_927_159_086 },
      { label: "└ ファミリー（AINAGOC負担）", asia: 2_204_156_998, para: 237_817_800, total: 2_441_974_798, breakdown: true },
      { label: "└ ファミリー（利用者負担）", asia: null, para: 234_300_000, total: 234_300_000, breakdown: true },
      { label: "└ 技術役員", asia: 1_724_607_631, para: 344_907_436, total: 2_069_515_067, breakdown: true },
      { label: "└ スポンサー（利用者負担）", asia: 1_285_487_677, para: 837_038_639, total: 2_122_526_316, breakdown: true },
      { label: "└ メディア（利用者負担）", asia: 2_656_553_304, para: 402_289_601, total: 3_058_842_905, breakdown: true },
    ],
  },
  {
    label: "飲食費（昼食及び夕食）",
    indicatedAmount: 3_091_220_580,
    asiaTotal: 2_634_922_502,
    paraTotal: 1_032_249_270,
    total: 3_667_171_772,
    subRows: [
      { label: "ホテル（選手団）昼食及び夕食", asia: 1_294_167_096, para: 715_948_560, total: 2_010_115_656 },
      { label: "ホテル（選手団）ｱｽﾘｰﾄﾐｰﾙ差額", asia: 160_786_990, para: 48_445_560, total: 209_232_550 },
      { label: "ホテル（選手団以外）", asia: 1_179_968_416, para: 267_855_150, total: 1_447_823_566 },
      { label: "└ ファミリー（AINAGOC負担）", asia: 453_261_666, para: 12_202_608, total: 465_464_274, breakdown: true },
      { label: "└ ファミリー（利用者負担）", asia: null, para: 60_203_792, total: 60_203_792, breakdown: true },
      { label: "└ 技術役員", asia: 726_706_750, para: 195_448_750, total: 922_155_500, breakdown: true },
    ],
  },
  {
    label: "飲食費（ハラル・ヴィーガン対応）",
    indicatedAmount: 1_288_076_800,
    asiaTotal: 1_491_496_786,
    paraTotal: 817_894_226,
    total: 2_309_391_012,
    subRows: [
      { label: "ホテル自前", asia: 189_851_256, para: 112_752_504, total: 302_603_760 },
      { label: "完調品対応", asia: 1_301_645_530, para: 705_141_722, total: 2_006_787_252 },
      { label: "└ 完調品調達費用", asia: 674_782_980, para: 365_550_852, total: 1_040_333_832, breakdown: true },
      { label: "└ ホテル経費", asia: 626_862_550, para: 339_590_870, total: 966_453_420, breakdown: true },
    ],
  },
  {
    label: "飲食費（グラブアンドゴー）",
    indicatedAmount: 132_220_000,
    asiaTotal: 85_873_040,
    paraTotal: 47_505_920,
    total: 133_378_960,
    subRows: [
      { label: "ホテル", asia: 85_873_040, para: 47_505_920, total: 133_378_960 },
    ],
  },
  {
    label: "飲食費（空港島運営・ガーデンふ頭・仮設厨房）",
    indicatedAmount: 993_269_000,
    asiaTotal: 755_889_349,
    paraTotal: 0,
    total: 755_889_349,
    subRows: [
      { label: "空港島運営経費", asia: 678_889_349, para: null, total: 678_889_349 },
      { label: "空港島仮設厨房経費", asia: 77_000_000, para: null, total: 77_000_000 },
    ],
  },
  {
    label: "飲食費（その他経費・支援機器設置等）",
    indicatedAmount: 88_653_000,
    asiaTotal: 72_000_000,
    paraTotal: 16_653_000,
    total: 88_653_000,
    subRows: [
      { label: "ホテル厨房機器レンタル", asia: 72_000_000, para: 16_653_000, total: 88_653_000 },
    ],
  },
  {
    label: "会議室等確保費",
    indicatedAmount: 5_386_971_860,
    asiaTotal: 3_613_385_702,
    paraTotal: 1_662_442_668,
    total: 5_275_828_370,
    hasDetail: true,
    subRows: [
      { label: "ホテル（選手団）", asia: 1_719_190_102, para: 1_006_052_139, total: 2_725_242_241 },
      { label: "ホテル（選手団以外）", asia: 1_894_195_600, para: 656_390_529, total: 2_550_586_129 },
      { label: "└ ファミリー", asia: 1_133_891_586, para: 288_657_600, total: 1_422_549_186, breakdown: true },
      { label: "└ 技術役員", asia: 760_304_014, para: 367_732_929, total: 1_128_036_943, breakdown: true },
    ],
  },
  {
    label: "営業補償費",
    indicatedAmount: 1_636_945_380,
    asiaTotal: 121_461_025,
    paraTotal: 110_695_355,
    total: 232_156_380,
    subRows: [
      { label: "ホテル（一棟貸しによる補償）", asia: 107_536_025, para: 104_305_355, total: 211_841_380 },
      { label: "└ 選手団", asia: 71_660_120, para: 103_513_355, total: 175_173_475, breakdown: true },
      { label: "└ ファミリー", asia: 35_875_905, para: 792_000, total: 36_667_905, breakdown: true },
      { label: "ホテル（クリーンベニューによる補償）", asia: 13_925_000, para: 6_390_000, total: 20_315_000 },
      { label: "└ 選手団（自動販売機補償）", asia: 13_925_000, para: 6_390_000, total: 20_315_000, breakdown: true },
      { label: "└ 選手団（テナント等補償）", asia: null, para: null, total: null, breakdown: true },
    ],
  },
  {
    label: "ランドリーサービス費",
    indicatedAmount: 160_043_722,
    asiaTotal: 74_703_200,
    paraTotal: 20_944_000,
    total: 95_647_200,
    subRows: [
      { label: "ランドリーサービス費（選手団以外）", asia: 74_703_200, para: 20_944_000, total: 95_647_200 },
    ],
  },
];

const GRAND_TOTAL = {
  indicatedAmount: 29_007_806_307,
  asiaTotal: 20_534_378_871,
  paraTotal: 8_395_286_249,
  total: 28_929_665_120,
};

type Tab = "hotels" | "overall" | "budget" | "version" | "meal";

interface Props {
  onNavigate: (tab: Tab) => void;
}

export default function BudgetOverallView({ onNavigate }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">全体予算管理</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            内示額反映積算（VIL移管反映）— 2026年1月現在。内示金額は2024年7月31日枠要求時点の額。
            各行をクリックすると内訳を展開できます。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                <th className="text-left py-3 px-4 font-medium text-gray-600 min-w-56">予算項目</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap">
                  内示金額<br/>（7/31枠要求）
                </th>
                <th className="text-right py-3 px-3 font-medium text-blue-600 whitespace-nowrap">
                  アジア<br/>小計
                </th>
                <th className="text-right py-3 px-3 font-medium text-purple-600 whitespace-nowrap">
                  パラ<br/>小計
                </th>
                <th className="text-right py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                  全体<br/>合計
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => {
                const isExpanded = expanded.has(cat.label);

                return (
                  <Fragment key={cat.label}>
                    {/* Main category row */}
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer select-none"
                      onClick={() => toggle(cat.label)}
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        <span className="inline-block w-4 text-gray-400 text-xs mr-1">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                        {cat.label}
                        {cat.hasDetail && (
                          <button
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              onNavigate("budget");
                            }}
                            className="ml-2 text-xs text-blue-500 hover:text-blue-700 underline-offset-2 hover:underline"
                          >
                            詳細→
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-400 text-xs">
                        {fmt(cat.indicatedAmount)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-900">
                        {fmt(cat.asiaTotal)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-900">
                        {fmt(cat.paraTotal)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-medium text-gray-900">
                        {fmt(cat.total)}
                      </td>
                    </tr>

                    {/* Sub-rows when expanded */}
                    {isExpanded &&
                      cat.subRows.map((sub, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-gray-50 ${
                            sub.breakdown
                              ? "bg-gray-50/60"
                              : "bg-blue-50/20"
                          }`}
                        >
                          <td
                            className={`py-1.5 px-4 text-xs ${
                              sub.breakdown
                                ? "pl-12 text-gray-400"
                                : "pl-9 text-gray-600"
                            }`}
                          >
                            {sub.breakdown && (
                              <span className="text-gray-300 mr-1">内訳</span>
                            )}
                            {sub.label}
                          </td>
                          <td className="py-1.5 px-3 text-right text-gray-300 text-xs">—</td>
                          <td
                            className={`py-1.5 px-3 text-right tabular-nums text-xs ${
                              sub.breakdown ? "text-gray-400" : "text-gray-700"
                            }`}
                          >
                            {fmt(sub.asia)}
                          </td>
                          <td
                            className={`py-1.5 px-3 text-right tabular-nums text-xs ${
                              sub.breakdown ? "text-gray-400" : "text-gray-700"
                            }`}
                          >
                            {fmt(sub.para)}
                          </td>
                          <td
                            className={`py-1.5 px-3 text-right tabular-nums text-xs ${
                              sub.breakdown ? "text-gray-400" : "text-gray-700"
                            }`}
                          >
                            {fmt(sub.total)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                <td className="py-3 px-4 text-gray-800">合計</td>
                <td className="py-3 px-3 text-right tabular-nums text-gray-400 text-xs">
                  {fmt(GRAND_TOTAL.indicatedAmount)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-gray-900">
                  {fmt(GRAND_TOTAL.asiaTotal)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-gray-900">
                  {fmt(GRAND_TOTAL.paraTotal)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-gray-900">
                  {fmt(GRAND_TOTAL.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">
            出典: 読み込み用 20260123 内示額反映 宿泊費積算根拠.xlsx「内示額反映積算（VIL移管反映）」シート B86:P120
          </p>
        </div>
      </div>
    </div>
  );
}
