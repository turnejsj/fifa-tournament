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
import { buildPnlPerHourOfDay } from "@/lib/analytics-performance-series"

const GREEN = "#00F081"
const RED = "#FF4D4D"

const formatCurrency = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

interface HourlyPnlChartProps {
  trades: DbTradeRow[]
  title?: string
}

export function HourlyPnlChart({
  trades,
  title = "P&L per time of day",
}: HourlyPnlChartProps) {
  const hourlySeries = useMemo(() => buildPnlPerHourOfDay(trades), [trades])

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h3>
      <p className="mt-1 text-[11px] text-zinc-500">
        From Orders CSV fills: Net P/L summed by hour (local time).
      </p>
      <div className="mt-3 h-56 w-full min-w-0">
        {trades.length === 0 ? (
          <p className="text-sm text-zinc-500">Upload an Orders CSV to populate this chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="hourLabel" tick={{ fill: "#9ca3af", fontSize: 10 }} interval={1} />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(Number(v))}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Net P/L"]}
                labelFormatter={(label) => `Hour ${label}`}
                contentStyle={{
                  backgroundColor: "#111",
                  border: "1px solid #1A1A1A",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {hourlySeries.map((entry) => (
                  <Cell key={entry.hour} fill={entry.pnl >= 0 ? GREEN : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
