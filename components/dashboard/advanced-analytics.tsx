"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { DbTradeRow } from "@/lib/trade-store"
import { cn } from "@/lib/utils"
import { AnalyticsTradeSummaryTables } from "@/components/dashboard/analytics-trade-summary-tables"

interface AdvancedAnalyticsProps {
  trades: DbTradeRow[]
  /** True when Analytics account dropdown is a single PA (not "All accounts"). */
  accountFilterActive?: boolean
}

const formatCurrency = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const DEFAULT_COMMISSION_PER_TRADE = 1.04

const HIST = { barCategoryGap: 0, barGap: 0 } as const

const CHART_GREEN = "#00F081"
const CHART_RED = "#FF4D4D"

export function AdvancedAnalytics({
  trades,
  accountFilterActive = false,
}: AdvancedAnalyticsProps) {
  const normalizedTrades = useMemo(() => {
    return trades.map((trade) => {
      const quantity = Number(trade.quantity) || 0
      const netPnl = Number(trade.net_pnl) || 0
      const entryPrice = Number(trade.entry_price) || 0
      const commission = Number(trade.commission ?? quantity * DEFAULT_COMMISSION_PER_TRADE)
      const isMNQ = trade.symbol?.toUpperCase().startsWith("MNQ")
      const multiplier = isMNQ ? 2 : 1
      const fallbackNetPnl =
        Number.isFinite(Number(trade.exit_price)) && Number.isFinite(entryPrice)
          ? (Number(trade.exit_price) - entryPrice) * quantity * multiplier
          : 0
      // If DB net_pnl is absent/invalid, use requested fallback formula.
      const effectiveNetPnl = Number.isFinite(netPnl) && netPnl !== 0 ? netPnl : fallbackNetPnl
      const priceDelta = quantity > 0 ? (effectiveNetPnl + commission) / (multiplier * quantity) : 0

      const buyPrice =
        trade.side === "Long"
          ? entryPrice
          : Number(trade.exit_price ?? entryPrice - priceDelta)
      const sellPrice =
        trade.side === "Long"
          ? Number(trade.exit_price ?? entryPrice + priceDelta)
          : entryPrice

      const entryDate = new Date(trade.trade_date)
      const exitDate = trade.exit_time ? new Date(trade.exit_time) : null
      const durationMinutes =
        exitDate && !Number.isNaN(entryDate.getTime()) && !Number.isNaN(exitDate.getTime())
          ? Math.max(0, (exitDate.getTime() - entryDate.getTime()) / (1000 * 60))
          : null

      return {
        ...trade,
        quantity,
        netPnl: effectiveNetPnl,
        entryPrice,
        buyPrice,
        sellPrice,
        commission,
        multiplier,
        durationMinutes,
      }
    })
  }, [trades])

  const metrics = useMemo(() => {
    const grossProfit = trades
      .filter((t) => Number(t.net_pnl) > 0)
      .reduce((sum, t) => sum + Number(t.net_pnl), 0)
    const grossLossAbs = Math.abs(
      trades
        .filter((t) => Number(t.net_pnl) < 0)
        .reduce((sum, t) => sum + Number(t.net_pnl), 0)
    )
    const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? 999 : 0
    const wins = normalizedTrades.filter((t) => t.netPnl > 0).length
    const winRate = normalizedTrades.length > 0 ? (wins / normalizedTrades.length) * 100 : 0
    const expectancy =
      normalizedTrades.length > 0
        ? normalizedTrades.reduce((sum, t) => sum + t.netPnl, 0) / normalizedTrades.length
        : 0
    const avgLossAbs = normalizedTrades
      .filter((t) => t.netPnl < 0)
      .reduce((sum, t) => sum + Math.abs(t.netPnl), 0) /
      Math.max(
        normalizedTrades.filter((t) => t.netPnl < 0).length,
        1
      )
    const avgRMultiple =
      avgLossAbs > 0
        ? normalizedTrades.reduce((sum, t) => sum + t.netPnl / avgLossAbs, 0) /
          Math.max(normalizedTrades.length, 1)
        : 0

    const sortedByDate = [...normalizedTrades].sort((a, b) => {
      return new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    })
    let runningEquity = 0
    let peak = 0
    let maxDrawdown = 0
    for (const trade of sortedByDate) {
      runningEquity += trade.netPnl
      peak = Math.max(peak, runningEquity)
      maxDrawdown = Math.max(maxDrawdown, peak - runningEquity)
    }

    const avgTradeTime =
      normalizedTrades
        .map((trade) => trade.durationMinutes)
        .filter((value): value is number => value !== null)
        .reduce((sum, value, _, arr) => sum + value / arr.length, 0) || 0
    const longestTradeTime = normalizedTrades
      .map((trade) => trade.durationMinutes ?? 0)
      .reduce((max, value) => Math.max(max, value), 0)
    const totalCommission = normalizedTrades.reduce(
      (sum, trade) => sum + trade.commission,
      0
    )
    const grossPnl = normalizedTrades.reduce((sum, trade) => sum + trade.netPnl, 0)

    return {
      profitFactor,
      winRate,
      expectancy,
      avgRMultiple,
      maxDrawdown,
      avgTradeTime,
      longestTradeTime,
      totalCommission,
      grossPnl,
      allTradesCount: normalizedTrades.length,
      profitTradesCount: normalizedTrades.filter((t) => t.netPnl > 0).length,
      losingTradesCount: normalizedTrades.filter((t) => t.netPnl < 0).length,
      profitTradesPnl: normalizedTrades
        .filter((t) => t.netPnl > 0)
        .reduce((sum, t) => sum + t.netPnl, 0),
      losingTradesPnl: normalizedTrades
        .filter((t) => t.netPnl < 0)
        .reduce((sum, t) => sum + t.netPnl, 0),
    }
  }, [normalizedTrades, trades])

  const distributionData = useMemo(() => {
    const winBuckets = [
      { label: "0-100", min: 0, max: 100, value: 0 },
      { label: "100-300", min: 100, max: 300, value: 0 },
      { label: "300-700", min: 300, max: 700, value: 0 },
      { label: "700+", min: 700, max: Number.POSITIVE_INFINITY, value: 0 },
    ]
    const lossBuckets = [
      { label: "0-100", min: 0, max: 100, value: 0 },
      { label: "100-300", min: 100, max: 300, value: 0 },
      { label: "300-700", min: 300, max: 700, value: 0 },
      { label: "700+", min: 700, max: Number.POSITIVE_INFINITY, value: 0 },
    ]

    for (const trade of normalizedTrades) {
      const abs = Math.abs(trade.netPnl)
      const target = trade.netPnl >= 0 ? winBuckets : lossBuckets
      const bucket = target.find((b) => abs >= b.min && abs < b.max)
      if (bucket) bucket.value += 1
    }

    return winBuckets.map((bucket, idx) => ({
      bucket: bucket.label,
      wins: bucket.value,
      losses: lossBuckets[idx].value,
    }))
  }, [normalizedTrades])

  const symbolRanking = useMemo(() => {
    const map = new Map<string, number>()
    for (const trade of trades) {
      map.set(trade.symbol, (map.get(trade.symbol) ?? 0) + Number(trade.net_pnl))
    }
    return Array.from(map.entries())
      .map(([symbol, total]) => ({ symbol, total }))
      .sort((a, b) => b.total - a.total)
  }, [trades])

  const dailyVolumeScatter = useMemo(() => {
    const map = new Map<string, { date: string; trades: number; pnl: number }>()
    for (const trade of trades) {
      const key = trade.trade_date.slice(0, 10)
      const existing = map.get(key) ?? { date: key, trades: 0, pnl: 0 }
      existing.trades += 1
      existing.pnl += Number(trade.net_pnl)
      map.set(key, existing)
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [trades])

  const healthCards = [
    { label: "Gross P&L", value: formatCurrency(metrics.grossPnl) },
    { label: "Expectancy", value: formatCurrency(metrics.expectancy) },
    { label: "Profit Factor", value: metrics.profitFactor.toFixed(2) },
    { label: "Win %", value: `${metrics.winRate.toFixed(1)}%` },
    { label: "Avg Trade Time", value: `${metrics.avgTradeTime.toFixed(1)}m` },
    { label: "Longest Trade", value: `${metrics.longestTradeTime.toFixed(1)}m` },
    { label: "Avg R-Multiple", value: metrics.avgRMultiple.toFixed(2) },
    { label: "Max Drawdown", value: formatCurrency(metrics.maxDrawdown) },
    { label: "Total Commission", value: formatCurrency(metrics.totalCommission) },
  ]

  const mistakeStats = useMemo(() => {
    const tagged = trades.filter(
      (trade) => trade.mistake_tag && trade.mistake_tag !== "None"
    )
    const fomoCount = tagged.filter((trade) => trade.mistake_tag === "FOMO").length
    const chasingCount = tagged.filter((trade) => trade.mistake_tag === "Chasing").length
    const taggedPnl = tagged.reduce((sum, trade) => sum + Number(trade.net_pnl), 0)
    return {
      totalTagged: tagged.length,
      fomoCount,
      chasingCount,
      taggedPnl,
    }
  }, [trades])

  const statCards = [
    {
      label: "All Trades",
      count: metrics.allTradesCount,
      pnl: metrics.grossPnl,
      tone: "text-white",
    },
    {
      label: "Profit Trades",
      count: metrics.profitTradesCount,
      pnl: metrics.profitTradesPnl,
      tone: "text-[#00F081]",
    },
    {
      label: "Losing Trades",
      count: metrics.losingTradesCount,
      pnl: metrics.losingTradesPnl,
      tone: "text-[#FF4D4D]",
    },
  ]

  return (
    <div className="space-y-6 rounded-xl border border-[#1A1A1A] bg-[#050505] p-3 text-white md:p-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-400">{card.label}</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-bold">{card.count}</div>
              <div className={cn("text-sm font-semibold", card.tone)}>{formatCurrency(card.pnl)}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">Core Stats Panel</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {healthCards.map((card) => (
            <div key={card.label} className="rounded-md border border-[#222] bg-[#0d0d0d] p-3">
              <div className="text-xs text-zinc-400">{card.label}</div>
              <div className="mt-1 text-xl font-bold text-white">{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h3 className="mb-3 text-base font-semibold text-white">P&amp;L Distribution (Histogram)</h3>
        <div className="h-64 max-w-3xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData} {...HIST}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="bucket" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="wins" stackId="a" fill={CHART_GREEN} />
              <Bar dataKey="losses" stackId="a" fill={CHART_RED} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">Mistake Tracker</h3>
        <div className="mb-4 h-40 max-w-md">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { tag: "FOMO", count: mistakeStats.fomoCount },
                { tag: "Chasing", count: mistakeStats.chasingCount },
              ]}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              {...HIST}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="tag" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#a78bfa" maxBarSize={72} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-md border border-[#222] bg-[#0d0d0d] p-3">
            <div className="text-xs text-zinc-400">Tagged Trades</div>
            <div className="mt-1 text-xl font-bold text-white">{mistakeStats.totalTagged}</div>
          </div>
          <div className="rounded-md border border-[#222] bg-[#0d0d0d] p-3">
            <div className="text-xs text-zinc-400">FOMO Tags</div>
            <div className="mt-1 text-xl font-bold text-white">{mistakeStats.fomoCount}</div>
          </div>
          <div className="rounded-md border border-[#222] bg-[#0d0d0d] p-3">
            <div className="text-xs text-zinc-400">Chasing Tags</div>
            <div className="mt-1 text-xl font-bold text-white">{mistakeStats.chasingCount}</div>
          </div>
          <div className="rounded-md border border-[#222] bg-[#0d0d0d] p-3">
            <div className="text-xs text-zinc-400">Tagged P&amp;L</div>
            <div
              className={cn(
                "mt-1 text-xl font-bold",
                mistakeStats.taggedPnl >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
              )}
            >
              {formatCurrency(mistakeStats.taggedPnl)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">Nemesis vs. ATM (Histogram)</h3>
        <p className="mb-3 text-sm text-zinc-500">Net P/L by symbol (horizontal bins).</p>
        <div className="mb-4" style={{ height: Math.min(420, Math.max(160, symbolRanking.length * 28)) }}>
          {symbolRanking.length === 0 ? (
            <p className="text-sm text-zinc-500">No symbols in filtered trades.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={symbolRanking}
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                barCategoryGap={0}
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => formatCurrency(Number(v))} />
                <YAxis
                  type="category"
                  dataKey="symbol"
                  width={72}
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="total" maxBarSize={22}>
                  {symbolRanking.map((entry, i) => {
                    const only = symbolRanking.length === 1
                    const fill = only
                      ? entry.total >= 0
                        ? CHART_GREEN
                        : CHART_RED
                      : i === 0
                        ? CHART_GREEN
                        : i === symbolRanking.length - 1
                          ? CHART_RED
                          : entry.total >= 0
                            ? CHART_GREEN
                            : CHART_RED
                    return <Cell key={entry.symbol} fill={fill} opacity={0.85} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <h4 className="mb-2 text-sm font-semibold text-zinc-400">Detail table</h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-[#111]">
              <tr>
                <th className="sticky left-0 z-10 bg-[#111] px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-right">Total Profit</th>
              </tr>
            </thead>
            <tbody>
              {symbolRanking.map((row, idx) => {
                const label =
                  idx === 0 ? "ATM Ticker" : idx === symbolRanking.length - 1 ? "Nemesis Ticker" : ""
                return (
                  <tr key={row.symbol} className="border-t border-[#222]">
                    <td className="sticky left-0 z-[1] bg-[#0D0D0D] px-3 py-2">{row.symbol}</td>
                    <td className="px-3 py-2">
                      {label && (
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-semibold",
                            label === "ATM Ticker"
                              ? "bg-[#00F081]/20 text-[#00F081]"
                              : "bg-[#FF4D4D]/20 text-[#FF4D4D]"
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        row.total >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
                      )}
                    >
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Daily P&amp;L &amp; trade count (Histogram)
        </h3>
        <p className="mb-3 text-sm text-zinc-500">
          One bin per calendar day: bar height is daily Net P/L; tooltip includes number of trades
          that day.
        </p>
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyVolumeScatter} margin={{ top: 8, right: 12, left: 4, bottom: 36 }} {...HIST}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: 9 }}
                tickFormatter={(d) => String(d).slice(5)}
                interval="preserveStartEnd"
                angle={dailyVolumeScatter.length > 8 ? -40 : 0}
                textAnchor={dailyVolumeScatter.length > 8 ? "end" : "middle"}
                height={dailyVolumeScatter.length > 8 ? 50 : 30}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "pnl" ? [formatCurrency(value), "Daily Net P/L"] : [value, "Trades"]
                }
                labelFormatter={(label, payload) => {
                  const row = payload?.[0]?.payload as { date?: string } | undefined
                  return row?.date ? `Day ${row.date}` : String(label)
                }}
                contentStyle={{
                  backgroundColor: "#111",
                  border: "1px solid #1A1A1A",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="pnl" maxBarSize={56}>
                {dailyVolumeScatter.map((entry, i) => (
                  <Cell
                    key={`${entry.date}-${i}`}
                    fill={entry.pnl >= 0 ? CHART_GREEN : CHART_RED}
                    opacity={entry.trades > 5 ? 1 : 0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <AnalyticsTradeSummaryTables
        normalizedTrades={normalizedTrades}
        accountFilterActive={accountFilterActive}
      />

      <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">Detailed Trade Table</h3>
        <div className="overflow-x-auto rounded-md border border-[#222]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#111]">
              <tr>
                <th className="sticky left-0 z-10 bg-[#111] px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-right">Duration</th>
                <th className="px-3 py-2 text-right">Net P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {[...normalizedTrades]
                .sort(
                  (a, b) =>
                    new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
                )
                .map((trade) => (
                  <tr key={trade.order_id} className="border-t border-[#1a1a1a]">
                    <td className="sticky left-0 z-[1] bg-[#0D0D0D] px-3 py-2">{trade.trade_date.slice(0, 10)}</td>
                    <td className="px-3 py-2">{trade.symbol}</td>
                    <td className="px-3 py-2 text-right">
                      {trade.durationMinutes !== null
                        ? `${trade.durationMinutes.toFixed(1)}m`
                        : "N/A"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        trade.netPnl >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
                      )}
                    >
                      {formatCurrency(trade.netPnl)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
