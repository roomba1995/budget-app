import {
  Hotel,
  COST_CATEGORIES,
  CATEGORY_COLORS,
  GROUP_COLORS,
  GROUPS,
  calcVariance,
  formatCurrency,
} from "@/types";

interface Props {
  hotels: Hotel[];
}

export default function SummarySection({ hotels }: Props) {
  const totalBudget = hotels.reduce(
    (s, h) => s + h.costItems.reduce((ss, i) => ss + i.budgetAmount, 0),
    0
  );
  const totalActual = hotels.reduce(
    (s, h) => s + h.costItems.reduce((ss, i) => ss + i.actualAmount, 0),
    0
  );
  const variance = calcVariance(totalBudget, totalActual);
  const varianceRate =
    totalBudget > 0
      ? ((totalActual - totalBudget) / totalBudget) * 100
      : 0;

  // Category breakdown
  const categoryTotals = COST_CATEGORIES.map((cat) => {
    const budget = hotels.reduce(
      (s, h) =>
        s +
        h.costItems
          .filter((i) => i.category === cat)
          .reduce((ss, i) => ss + i.budgetAmount, 0),
      0
    );
    const actual = hotels.reduce(
      (s, h) =>
        s +
        h.costItems
          .filter((i) => i.category === cat)
          .reduce((ss, i) => ss + i.actualAmount, 0),
      0
    );
    return { cat, budget, actual };
  }).filter((x) => x.budget > 0 || x.actual > 0);

  // Group breakdown
  const groupStats = GROUPS.map((g) => {
    const groupHotels = hotels.filter((h) => h.groups.includes(g));
    const budget = groupHotels.reduce(
      (s, h) => s + h.costItems.reduce((ss, i) => ss + i.budgetAmount, 0),
      0
    );
    const actual = groupHotels.reduce(
      (s, h) => s + h.costItems.reduce((ss, i) => ss + i.actualAmount, 0),
      0
    );
    return { g, count: groupHotels.length, budget, actual };
  }).filter((x) => x.count > 0);

  const rateText = `${varianceRate > 0 ? "+" : ""}${varianceRate.toFixed(1)}%`;
  const rateColor =
    varianceRate > 0 ? "text-red-600" : varianceRate < 0 ? "text-emerald-600" : "text-gray-400";

  if (hotels.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Top cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="予算合計"
          value={formatCurrency(totalBudget)}
          sub={`${hotels.length}ホテル`}
          borderColor="border-blue-200"
          bgColor="bg-blue-50"
        />
        <SummaryCard
          label="実績合計"
          value={formatCurrency(totalActual)}
          sub="確定・見込み含む"
          borderColor="border-indigo-200"
          bgColor="bg-indigo-50"
        />
        <SummaryCard
          label="乖離額"
          value={variance.text}
          sub={variance.diff > 0 ? "予算超過" : variance.diff < 0 ? "予算内" : "予算通り"}
          borderColor={
            variance.diff > 0
              ? "border-red-200"
              : variance.diff < 0
              ? "border-emerald-200"
              : "border-gray-200"
          }
          bgColor={
            variance.diff > 0
              ? "bg-red-50"
              : variance.diff < 0
              ? "bg-emerald-50"
              : "bg-gray-50"
          }
          valueClass={variance.className}
        />
        <SummaryCard
          label="乖離率"
          value={rateText}
          sub={`予算 ${formatCurrency(totalBudget)} 基準`}
          borderColor={
            varianceRate > 0
              ? "border-red-200"
              : varianceRate < 0
              ? "border-emerald-200"
              : "border-gray-200"
          }
          bgColor={
            varianceRate > 0
              ? "bg-red-50"
              : varianceRate < 0
              ? "bg-emerald-50"
              : "bg-gray-50"
          }
          valueClass={rateColor}
        />
      </div>

      {/* Breakdown panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Category breakdown */}
        {categoryTotals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              費目別内訳
            </h2>
            <div className="space-y-2.5">
              {categoryTotals.map(({ cat, budget, actual }) => {
                const v = calcVariance(budget, actual);
                const pct =
                  totalBudget > 0
                    ? Math.min(100, (budget / totalBudget) * 100)
                    : 0;
                const actualPct =
                  budget > 0 ? Math.min(120, (actual / budget) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat]}`}
                      >
                        {cat}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400">
                          予算 {formatCurrency(budget)}
                        </span>
                        <span className="text-gray-700 font-medium">
                          実績 {formatCurrency(actual)}
                        </span>
                        <span className={`font-semibold ${v.className}`}>
                          {v.text}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          actualPct > 100 ? "bg-red-400" : "bg-blue-400"
                        }`}
                        style={{ width: `${actualPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Group breakdown */}
        {groupStats.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              グループ別内訳
            </h2>
            <div className="space-y-2">
              {groupStats.map(({ g, count, budget, actual }) => {
                const v = calcVariance(budget, actual);
                return (
                  <div
                    key={g}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${GROUP_COLORS[g]}`}
                      >
                        {g}
                      </span>
                      <span className="text-xs text-gray-400">
                        {count}ホテル
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400">
                        {formatCurrency(budget)}
                      </span>
                      <span className="text-gray-700 font-medium">
                        {formatCurrency(actual)}
                      </span>
                      <span className={`w-20 text-right ${v.className}`}>
                        {v.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  borderColor,
  bgColor,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  borderColor: string;
  bgColor: string;
  valueClass?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bgColor} ${borderColor}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-base sm:text-lg font-bold break-all ${
          valueClass || "text-gray-900"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
