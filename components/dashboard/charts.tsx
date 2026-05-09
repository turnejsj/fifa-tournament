"use client"

import { Settings, MoreHorizontal, Info } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
} from "recharts"
import type { DbTradeRow } from "@/lib/trade-store"
import { parseUsSlashDateTime } from "@/lib/trade-timestamps"

interface MonthlyReturnPoint {
  label: string
  value: number
}

interface EquityPoint {
  label: string
  value: number
}

interface DistributionPoint {
  bucket: string
  count: number
}

// Trade duration data
const tradeDurationData = [
  { duration: 5, pnl: -15000, color: "#ef4444" },
  { duration: 10, pnl: -10000, color: "#ef4444" },
  { duration: 15, pnl: -5000, color: "#ef4444" },
  { duration: 20, pnl: 5000, color: "#22c55e" },
  { duration: 25, pnl: -8000, color: "#ef4444" },
  { duration: 30, pnl: 10000, color: "#22c55e" },
  { duration: 35, pnl: 20000, color: "#22c55e" },
  { duration: 40, pnl: -12000, color: "#ef4444" },
  { duration: 45, pnl: 25000, color: "#22c55e" },
  { duration: 50, pnl: 40000, color: "#22c55e" },
  { duration: 55, pnl: -5000, color: "#ef4444" },
  { duration: 60, pnl: 80000, color: "#22c55e" },
  { duration: 65, pnl: 150000, color: "#22c55e" },
]

// Progress tracker data (contribution-like heatmap)
const progressData = {
  months: ["Dec", "Jan"],
  days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  data: [
    [0, 1, 2, 3, 0, 1, 2],
    [1, 2, 3, 4, 2, 1, 0],
    [0, 1, 2, 2, 3, 2, 1],
    [2, 3, 4, 3, 2, 1, 0],
  ],
}

interface BalanceChartProps {
  data?: MonthlyReturnPoint[]
}

export function BalanceChart({ data = [] }: BalanceChartProps) {
  const chartData = data.length > 0 ? data : [{ label: "No Data", value: 0 }]
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Monthly P&L"]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? "#00F081" : "#FF4D4D"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface EquityMiniChartProps {
  data?: EquityPoint[]
}

export function EquityMiniChart({ data = [] }: EquityMiniChartProps) {
  const chartData = data.length > 0 ? data : [{ label: "N/A", value: 0 }]
  return (
    <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        Equity Curve
      </div>
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#00F081"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{chartData[0]?.label ?? ""}</span>
        <span>{chartData[chartData.length - 1]?.label ?? ""}</span>
      </div>
    </div>
  )
}

interface PnLMiniChartProps {
  data?: DistributionPoint[]
}

export function PnLMiniChart({ data = [] }: PnLMiniChartProps) {
  const chartData = data.length > 0 ? data : [{ bucket: "N/A", count: 0 }]

  return (
    <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        P&amp;L Distribution
      </div>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="bucket" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#FF4D4D" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function TradeDurationChart() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-card-foreground">
            Trade Duration Performance
          </span>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded p-1 hover:bg-muted">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="rounded p-1 hover:bg-muted">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="duration"
                name="Duration"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                type="number"
                dataKey="pnl"
                name="P&L"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, "P&L"]}
                labelFormatter={(value) => `Duration: ${value} min`}
              />
              <Scatter
                data={tradeDurationData.filter((d) => d.pnl >= 0)}
                fill="#00F081"
              />
              <Scatter
                data={tradeDurationData.filter((d) => d.pnl < 0)}
                fill="#FF4D4D"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function ProgressTracker() {
  const getIntensityClass = (value: number) => {
    if (value === 0) return "bg-muted"
    if (value === 1) return "bg-primary/20"
    if (value === 2) return "bg-primary/40"
    if (value === 3) return "bg-primary/60"
    return "bg-primary/80"
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-card-foreground">Progress Tracker</span>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <button className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">
          Explore
        </button>
      </div>
      <div className="p-4">
        <div className="mb-2 flex justify-end gap-4 text-xs text-muted-foreground">
          {progressData.months.map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {progressData.days.map((day) => (
              <div key={day} className="flex h-4 items-center">
                {day}
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-8 gap-1">
            {progressData.data.flat().map((value, index) => (
              <div
                key={index}
                className={`h-4 w-4 rounded-sm ${getIntensityClass(value)}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-sm ${getIntensityClass(i)}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

interface AccountBalanceChartProps {
  balance: number
  /** Starting balance used to build the equity curve (default $50,000). */
  startingBalance?: number
  /** Liquidation / safety floor shown as a horizontal reference (default $50,100). */
  safetyNet?: number
  /** Fills from Orders CSV — cumulative equity = starting + running Net P/L. */
  trades: DbTradeRow[]
}

const formatBalanceCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const NEON = "#00F081"

function parseTs(d: string): number {
  const s = String(d ?? "").trim()
  const us = parseUsSlashDateTime(s)
  if (us) return us.getTime()
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? 0 : t
}

function shortLabel(tradeDate: string): string {
  const s = String(tradeDate ?? "").trim()
  const us = parseUsSlashDateTime(s)
  const d = us ?? new Date(s)
  if (Number.isNaN(d.getTime())) return s.slice(0, 10)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function AccountBalanceChart({
  balance,
  startingBalance = 50_000,
  safetyNet = 50_100,
  trades,
}: AccountBalanceChartProps) {
  const safeBalance = Number.isFinite(balance) ? balance : startingBalance

  const equitySeries = (() => {
    const list = Array.isArray(trades) ? trades : []
    const sorted = list
      .filter((r) => r && typeof r.trade_date === "string" && r.trade_date.trim() !== "")
      .sort((a, b) => parseTs(a.trade_date) - parseTs(b.trade_date))
    if (sorted.length === 0) {
      return [{ label: "Now", equity: safeBalance }]
    }
    let run = startingBalance
    const pts: { label: string; equity: number }[] = [
      { label: "Start", equity: startingBalance },
    ]
    for (const t of sorted) {
      const pnl = Number(t.net_pnl)
      run += Number.isFinite(pnl) ? pnl : 0
      pts.push({ label: shortLabel(t.trade_date), equity: run })
    }
    if (pts.length > 0) pts[pts.length - 1] = { ...pts[pts.length - 1]!, equity: safeBalance }
    return pts
  })()

  const equities = equitySeries.map((p) => p.equity)
  const yMin = Math.min(...equities, safetyNet, startingBalance) * 0.998
  const yMax = Math.max(...equities, safetyNet, startingBalance) * 1.002

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Equity curve
      </div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{formatBalanceCurrency(safeBalance)}</span>
      </div>
      <div className="h-28 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equitySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} interval="preserveStartEnd" />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={(v) =>
                Number(v).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })
              }
            />
            <Tooltip
              formatter={(v: number) => [formatBalanceCurrency(v), "Equity"]}
              contentStyle={{
                backgroundColor: "#111",
                border: "1px solid #1A1A1A",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={safetyNet}
              stroke="#FF4D4D"
              strokeDasharray="5 5"
              strokeOpacity={0.85}
              label={{
                value: "Safety Net $50,100",
                position: "insideTopRight",
                fill: "#a1a1aa",
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke={NEON}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: NEON }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
