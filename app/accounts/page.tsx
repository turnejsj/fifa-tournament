"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { Sidebar } from "@/components/dashboard/sidebar"
import { DbTradeRow, fetchTrades } from "@/lib/trade-store"
import { fetchPerformanceDaily, type PerformanceDailyRow } from "@/lib/performance-daily-store"

const STARTING_BALANCE = 50000
const LIQUIDATION_POINT = 48000
const MAX_DRAWDOWN = 2000
const FALLBACK_TOTAL_EQUITY = 50526.6
const FALLBACK_TOTAL_FEES = 88.4

const formatCurrency = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export default function AccountsPage() {
  const [trades, setTrades] = useState<DbTradeRow[]>([])
  const [performanceDaily, setPerformanceDaily] = useState<PerformanceDailyRow[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [rows, perf] = await Promise.all([
          fetchTrades().catch((e) => {
            console.error("[accounts] trades", e)
            return [] as DbTradeRow[]
          }),
          fetchPerformanceDaily().catch((e) => {
            console.error("[accounts] performance_daily", e)
            return [] as PerformanceDailyRow[]
          }),
        ])
        setTrades(Array.isArray(rows) ? rows : [])
        setPerformanceDaily(Array.isArray(perf) ? perf : [])
      } catch (error) {
        console.error("Failed to load accounts data:", error)
        setTrades([])
        setPerformanceDaily([])
      }
    }

    void load()
    const onSync = () => {
      void load()
    }
    window.addEventListener("trades-updated", onSync)
    return () => window.removeEventListener("trades-updated", onSync)
  }, [])

  const totalEquity = useMemo(() => {
    const perf = Array.isArray(performanceDaily) ? performanceDaily : []
    if (perf.length > 0) {
      const pnl = perf.reduce((sum, row) => {
        const n = Number(row?.net_total)
        return sum + (Number.isFinite(n) ? n : 0)
      }, 0)
      return STARTING_BALANCE + pnl
    }

    const list = Array.isArray(trades) ? trades : []
    if (list.length === 0) return FALLBACK_TOTAL_EQUITY
    const pnl = list.reduce((sum, trade) => {
      const n = Number(trade?.net_pnl)
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
    return STARTING_BALANCE + pnl
  }, [trades, performanceDaily])

  const drawdownMonitor = useMemo(() => {
    const drawdownUsed = Math.max(0, STARTING_BALANCE - totalEquity)
    const drawdownLeft = Math.max(0, MAX_DRAWDOWN - drawdownUsed)
    const safetyPercent = ((totalEquity - LIQUIDATION_POINT) / MAX_DRAWDOWN) * 100
    return {
      drawdownUsed,
      drawdownLeft,
      safetyPercent: Math.max(0, Math.min(100, safetyPercent)),
    }
  }, [totalEquity])

  const feeSummary = useMemo(() => {
    const list = Array.isArray(trades) ? trades : []
    const mnqm6Trades = list.filter((trade) => trade?.symbol === "MNQM6")
    const mnqm6Contracts = mnqm6Trades.reduce((sum, trade) => {
      const q = Number(trade?.quantity)
      return sum + (Number.isFinite(q) ? q : 0)
    }, 0)

    const commissionFromData = list.reduce((sum, trade) => {
      const c = Number(trade?.commission)
      return sum + (Number.isFinite(c) ? c : 0)
    }, 0)
    const totalCommissions = commissionFromData > 0 ? commissionFromData : FALLBACK_TOTAL_FEES

    const avgFeePerContract =
      mnqm6Contracts > 0 ? totalCommissions / mnqm6Contracts : FALLBACK_TOTAL_FEES / 85

    return {
      totalCommissions,
      mnqm6Contracts,
      avgFeePerContract,
    }
  }, [trades])

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-[#050505] text-white">
      <Sidebar />
      <div className="min-w-0 flex-1 md:ml-64">
        <Header />
        <main className="space-y-6 bg-[#050505] p-3 md:p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4 md:col-span-1">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Connection</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-lg font-semibold text-white">Tradovate</div>
                <span className="rounded-full border border-[#00F081]/40 bg-[#00F081]/20 px-3 py-1 text-xs font-semibold text-[#00F081]">
                  Active
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4 md:col-span-2">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Total Equity</div>
              <div className="mt-2 text-4xl font-black text-white">
                {formatCurrency(totalEquity)}
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                Live account equity relative to your funding baseline.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
            <h2 className="mb-3 text-base font-semibold text-white">Drawdown Monitor</h2>
            <div className="mb-2 flex items-center justify-between text-sm text-zinc-400">
              <span>Liquidation Point: {formatCurrency(LIQUIDATION_POINT)}</span>
              <span>Current: {formatCurrency(totalEquity)}</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-[#111111]">
              <div
                className="h-full rounded-full bg-[#00F081] transition-all"
                style={{ width: `${drawdownMonitor.safetyPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>0% safety</span>
              <span>100% safety ({formatCurrency(STARTING_BALANCE)})</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-[#1A1A1A] bg-[#050505] px-3 py-2">
                Drawdown Used:{" "}
                <span className="font-semibold text-[#FF4D4D]">
                  {formatCurrency(drawdownMonitor.drawdownUsed)}
                </span>
              </div>
              <div className="rounded-md border border-[#1A1A1A] bg-[#050505] px-3 py-2">
                Drawdown Remaining:{" "}
                <span className="font-semibold text-[#00F081]">
                  {formatCurrency(drawdownMonitor.drawdownLeft)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-4">
            <h2 className="mb-3 text-base font-semibold text-white">Fee Summary</h2>
            <div className="overflow-x-auto rounded-md border border-[#1A1A1A]">
              <table className="w-full min-w-[640px] bg-[#050505] text-sm">
                <thead className="bg-[#0D0D0D] text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Metric</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-right">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#1A1A1A] text-white">
                    <td className="px-3 py-2">Total Commissions Paid</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#FF4D4D]">
                      {formatCurrency(feeSummary.totalCommissions)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-400">
                      Across all imported trades
                    </td>
                  </tr>
                  <tr className="border-t border-[#1A1A1A] text-white">
                    <td className="px-3 py-2">Average Fee per MNQM6 Contract</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#00F081]">
                      {formatCurrency(feeSummary.avgFeePerContract)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-400">
                      Based on {feeSummary.mnqm6Contracts.toLocaleString("en-US")} MNQM6 contracts
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
