"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { DbTradeRow } from "@/lib/trade-store"
import { supabase } from "@/lib/supabase-client"

const REPORT_MONTH = 3 // April (0-based)
const REPORT_YEAR = 2026

const formatCurrency = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const toDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default function ReportsPage() {
  const [trades, setTrades] = useState<DbTradeRow[]>([])

  useEffect(() => {
    const load = async () => {
      const primary = await supabase
        .from("trades")
        .select(
          "id, order_id, trade_date, symbol, side, quantity, entry_price, exit_price, net_pnl, account, mistake_tag, commission, created_at"
        )
        .order("trade_date", { ascending: true })
        .order("created_at", { ascending: true })

      if (!primary.error) {
        setTrades((primary.data ?? []) as DbTradeRow[])
        return
      }

      const fallback = await supabase
        .from("trades")
        .select(
          "id, order_id, trade_date, symbol, side, quantity, entry_price, exit_price, net_pnl, account, commission, created_at"
        )
        .order("trade_date", { ascending: true })
        .order("created_at", { ascending: true })

      if (fallback.error) {
        console.error("Failed to load reports trades:", fallback.error)
        return
      }

      setTrades((fallback.data ?? []) as DbTradeRow[])
    }

    void load()
  }, [])

  const aprilTrades = useMemo(
    () =>
      trades.filter((trade) => {
        const date = toDate(trade.trade_date)
        if (!date) return false
        return date.getFullYear() === REPORT_YEAR && date.getMonth() === REPORT_MONTH
      }),
    [trades]
  )

  const pnlPerHour = useMemo(() => {
    const buckets = new Map<number, number>()
    for (let hour = 0; hour < 24; hour += 1) buckets.set(hour, 0)

    for (const trade of aprilTrades) {
      const date = toDate(trade.trade_date)
      if (!date) continue
      const hour = date.getHours()
      buckets.set(hour, (buckets.get(hour) ?? 0) + Number(trade.net_pnl ?? 0))
    }

    return Array.from(buckets.entries())
      .map(([hour, pnl]) => ({
        hour: `${String(hour).padStart(2, "0")}:00`,
        pnl,
      }))
      .filter((item) => item.pnl !== 0)
  }, [aprilTrades])

  const winLossData = useMemo(() => {
    const wins = aprilTrades.filter((trade) => Number(trade.net_pnl) >= 0).length
    const losses = aprilTrades.length - wins
    return [
      { name: "Wins", value: wins, color: "#00F081" },
      { name: "Losses", value: losses, color: "#FF4D4D" },
    ]
  }, [aprilTrades])

  const mnqm6Rows = useMemo(() => {
    const onlyMnqm6 = aprilTrades.filter((trade) => trade.symbol === "MNQM6")
    const longTrades = onlyMnqm6.filter((trade) => trade.side === "Long")
    const shortTrades = onlyMnqm6.filter((trade) => trade.side === "Short")

    const buildRow = (label: string, rows: DbTradeRow[]) => {
      const totalVolume = rows.reduce((sum, trade) => sum + Number(trade.quantity ?? 0), 0)
      const netReturn = rows.reduce((sum, trade) => sum + Number(trade.net_pnl ?? 0), 0)
      return {
        label,
        trades: rows.length,
        volume: totalVolume,
        netReturn,
      }
    }

    return [
      buildRow("MNQM6 - Long", longTrades),
      buildRow("MNQM6 - Short", shortTrades),
      buildRow("MNQM6 - Total", onlyMnqm6),
    ]
  }, [aprilTrades])

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <Header />
        <main className="space-y-6 bg-[#050505] p-3 md:p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Profit Factor</div>
              <div className="mt-2 text-3xl font-bold text-white">1.68</div>
            </div>
            <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Expectancy</div>
              <div className="mt-2 text-3xl font-bold text-white">$32.37</div>
            </div>
            <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Total Fees</div>
              <div className="mt-2 text-3xl font-bold text-white">$(88.40)</div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
              <h2 className="mb-3 text-base font-semibold text-white">P&amp;L per Hour</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlPerHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                    <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {pnlPerHour.map((entry) => (
                        <Cell
                          key={entry.hour}
                          fill={entry.pnl >= 0 ? "#00F081" : "#FF4D4D"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
              <h2 className="mb-3 text-base font-semibold text-white">Win/Loss Distribution</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={100}
                    >
                      {winLossData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="text-[#00F081]">Wins: {winLossData[0]?.value ?? 0}</span>
                <span className="text-[#FF4D4D]">Losses: {winLossData[1]?.value ?? 0}</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
            <h2 className="mb-3 text-base font-semibold text-white">Symbol Detail (MNQM6)</h2>
            <div className="overflow-x-auto rounded-md border border-[#1A1A1A]">
              <table className="w-full min-w-[640px] bg-[#050505] text-sm">
                <thead className="bg-[#0D0D0D] text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Bucket</th>
                    <th className="px-3 py-2 text-right">Trades</th>
                    <th className="px-3 py-2 text-right">Volume</th>
                    <th className="px-3 py-2 text-right">Net Return</th>
                  </tr>
                </thead>
                <tbody>
                  {mnqm6Rows.map((row) => (
                    <tr key={row.label} className="border-t border-[#1A1A1A] text-white">
                      <td className="px-3 py-2">{row.label}</td>
                      <td className="px-3 py-2 text-right">{row.trades}</td>
                      <td className="px-3 py-2 text-right">{row.volume}</td>
                      <td
                        className={
                          row.netReturn >= 0
                            ? "px-3 py-2 text-right font-semibold text-[#00F081]"
                            : "px-3 py-2 text-right font-semibold text-[#FF4D4D]"
                        }
                      >
                        {formatCurrency(row.netReturn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
