"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts"
import { DbTradeRow } from "@/lib/trade-store"
import {
  buildCumulativePnlWithFeesSeries,
  buildDailyCumulativeHistogram,
  formatPerformanceAxisLabel,
} from "@/lib/analytics-performance-series"

const GREEN = "#00F081"
const RED = "#FF4D4D"
const BRIGHT_RED = "#FF3344"

/** Touching bars, sharp corners (histogram style). */
const HIST_PROPS = {
  barCategoryGap: 0,
  barGap: 0,
} as const

const formatCurrency = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

/** Label style: `$341.50` or `$(80.50)` for negatives. */
function formatPnlBarLabel(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (n < 0) return `($${abs})`
  return `$${abs}`
}

function timeOfDayHoursFromTimestamp(dateStr: string): number | null {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return (
    d.getHours() +
    d.getMinutes() / 60 +
    d.getSeconds() / 3600 +
    d.getMilliseconds() / 3600000
  )
}

function formatHourAxisTick(v: number): string {
  const clamped = Math.max(0, Math.min(23.999, v))
  const h = Math.floor(clamped)
  const m = Math.round((clamped - h) * 60)
  const mm = Math.min(59, Math.max(0, m))
  return `${h}:${String(mm).padStart(2, "0")}`
}

type TradeTimeScatterPoint = {
  order_id: string
  timeOfDay: number
  /** X position with micro-jitter so same-minute trades do not fully overlap. */
  timePlot: number
  netPnl: number
  /** Explicit coordinates for Recharts `ScatterChart`. */
  x: number
  y: number
  pnlLabel: string
  showLabel: boolean
}

function buildTradeByTradeTimeOfDaySeries(rows: DbTradeRow[]): TradeTimeScatterPoint[] {
  const raw = rows
    .map((row, i) => {
      const ts = String(row.trade_date ?? "").trim()
      const h = timeOfDayHoursFromTimestamp(ts)
      if (h === null) return null
      const netPnl = Number(row.net_pnl ?? 0)
      if (!Number.isFinite(netPnl)) return null
      return {
        order_id: String(row.order_id ?? i),
        timeOfDay: h,
        timePlot: h,
        netPnl,
        x: h,
        y: netPnl,
        pnlLabel: formatPnlBarLabel(netPnl),
        showLabel: false,
      }
    })
    .filter((p): p is TradeTimeScatterPoint => p !== null)

  raw.sort((a, b) => a.timeOfDay - b.timeOfDay || a.order_id.localeCompare(b.order_id))

  let lastH = -999
  let streak = 0
  for (const p of raw) {
    if (Math.abs(p.timeOfDay - lastH) < 1e-5) streak += 1
    else streak = 0
    p.timePlot = Math.min(23.999, p.timeOfDay + streak * 0.0035)
    p.x = p.timePlot
    p.y = p.netPnl
    lastH = p.timeOfDay
  }

  const absSorted = raw.map((r) => Math.abs(r.netPnl)).sort((a, b) => a - b)
  const idx = Math.max(0, Math.floor((absSorted.length - 1) * 0.85))
  const threshold = absSorted[idx] ?? 0

  for (const p of raw) {
    p.showLabel = Math.abs(p.netPnl) >= threshold && absSorted.length > 0 && threshold > 0
  }

  return raw
}

type ThinTradeBarProps = {
  cx?: number
  cy?: number
  payload?: TradeTimeScatterPoint
  xAxis?: { scale?: (v: number) => number }
  yAxis?: { scale?: (v: number) => number }
}

function ThinTradePnlBar(props: unknown) {
  const { cx, cy, payload, xAxis, yAxis } = props as ThinTradeBarProps
  if (
    cx == null ||
    cy == null ||
    !payload ||
    !xAxis?.scale ||
    !yAxis?.scale ||
    typeof xAxis.scale !== "function" ||
    typeof yAxis.scale !== "function"
  ) {
    return <g />
  }

  const y0 = yAxis.scale(0)
  const top = Math.min(y0, cy)
  const bottom = Math.max(y0, cy)
  const h = Math.max(bottom - top, 1.5)
  const halfW = 2.25
  const fill = payload.netPnl >= 0 ? GREEN : BRIGHT_RED
  const labelY = payload.netPnl >= 0 ? top - 4 : bottom + 11

  return (
    <g>
      <rect x={cx - halfW} y={top} width={halfW * 2} height={h} fill={fill} rx={0.35} />
      {payload.showLabel ? (
        <text
          x={cx}
          y={labelY}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          fill={payload.netPnl >= 0 ? GREEN : BRIGHT_RED}
          className="tabular-nums"
        >
          {payload.pnlLabel}
        </text>
      ) : null}
    </g>
  )
}

type HistRow = {
  barKey: string
  barLabel: string
  cumulativeWithFees: number
  dayNet: number
  netPnl: number
  timestampMs: number
}

function CumulativeHistTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as HistRow
  return (
    <div className="rounded-lg border border-[#1A1A1A] bg-[#111] px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-zinc-300">{row.barLabel}</div>
      <div className="mt-1 text-zinc-400">
        Period net P/L (bar height){" "}
        <span className={row.dayNet >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"}>
          {formatCurrency(row.dayNet)}
        </span>
      </div>
      <div className="text-zinc-400">
        Cumulative after this period{" "}
        <span className={row.cumulativeWithFees >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"}>
          {formatCurrency(row.cumulativeWithFees)}
        </span>
      </div>
    </div>
  )
}

interface AnalyticsPerformanceChartsProps {
  trades: DbTradeRow[]
}

export function AnalyticsPerformanceCharts({ trades }: AnalyticsPerformanceChartsProps) {
  const histRows = useMemo((): HistRow[] => {
    const byDay = buildDailyCumulativeHistogram(trades)
    if (byDay.length > 0) {
      return byDay.map((r) => ({
        barKey: r.day,
        barLabel: r.day,
        cumulativeWithFees: r.cumulativeWithFees,
        dayNet: r.dayNet,
        netPnl: r.dayNet,
        timestampMs: r.timestampMs,
      }))
    }
    const perFill = buildCumulativePnlWithFeesSeries(trades)
    return perFill.map((r, i) => ({
      barKey: String(i),
      barLabel: r.timestampLabel || formatPerformanceAxisLabel(r.timestampMs),
      cumulativeWithFees: r.cumulativeWithFees,
      dayNet: r.netPnl,
      netPnl: r.netPnl,
      timestampMs: r.timestampMs,
    }))
  }, [trades])

  const tradeTimeSeries = useMemo(() => buildTradeByTradeTimeOfDaySeries(trades), [trades])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h2 className="text-base font-semibold text-white">P&amp;L History (Histogram)</h2>
        <p className="mt-1 text-[11px] text-zinc-500">
          Bar height = net P/L for each day (or each fill if dates are non-standard). Tooltip shows
          running cumulative with fees as reported.
        </p>
        <div className="mt-4 h-60 w-full min-w-0 md:h-72">
          {histRows.length === 0 ? (
            <p className="text-sm text-zinc-500">Import orders / trades to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histRows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} {...HIST_PROPS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="barLabel"
                  tick={{ fill: "#9ca3af", fontSize: 8 }}
                  interval="preserveStartEnd"
                  angle={histRows.length > 10 ? -35 : 0}
                  textAnchor={histRows.length > 10 ? "end" : "middle"}
                  height={histRows.length > 10 ? 52 : 28}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} />
                <Tooltip content={<CumulativeHistTooltip />} />
                <Bar dataKey="dayNet" maxBarSize={48}>
                  {histRows.map((entry) => (
                    <Cell key={entry.barKey} fill={entry.dayNet >= 0 ? GREEN : RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {histRows.length > 0 && (
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Ending cumulative:{" "}
            <span
              className={
                (histRows[histRows.length - 1]?.cumulativeWithFees ?? 0) >= 0
                  ? "font-semibold text-[#00F081]"
                  : "font-semibold text-[#FF4D4D]"
              }
            >
              {formatCurrency(histRows[histRows.length - 1]?.cumulativeWithFees ?? 0)}
            </span>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h2 className="text-base font-semibold text-white">P&amp;L Per Time of Day (Trade by trade)</h2>
        <p className="mt-1 text-[11px] text-zinc-500">
          X-axis is clock time (0:00–23:59). Each thin bar is one trade at its fill timestamp (
          <code className="text-zinc-600">trade_date</code>). Same-minute fills are slightly offset so
          bars do not sit on top of each other. Outliers (top ~15% by |P/L|) show their amount.
        </p>
        <div className="mt-4 h-64 w-full min-w-0 md:h-80">
          {tradeTimeSeries.length === 0 ? (
            <p className="text-sm text-zinc-500">Import orders / trades with valid timestamps to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 28, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 24]}
                  ticks={[0, 4, 8, 12, 16, 20, 24]}
                  tickFormatter={(v) => formatHourAxisTick(Number(v))}
                  tick={{ fill: "#9ca3af", fontSize: 9 }}
                  name="Time"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                  width={64}
                />
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number, name: string) =>
                    name === "netPnl" ? [formatPnlBarLabel(value), "Net P/L"] : [value, name]
                  }
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as TradeTimeScatterPoint | undefined
                    if (!p) return ""
                    return `Time ${formatHourAxisTick(p.timeOfDay)} · ${p.order_id.slice(0, 18)}`
                  }}
                  contentStyle={{
                    backgroundColor: "#111",
                    border: "1px solid #1A1A1A",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Scatter
                  data={tradeTimeSeries}
                  fill={GREEN}
                  shape={ThinTradePnlBar}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
