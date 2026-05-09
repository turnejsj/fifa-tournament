"use client"

import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { AnalyticsCalendar } from "@/components/dashboard/analytics-calendar"
import { AdvancedAnalytics } from "@/components/dashboard/advanced-analytics"
import { AnalyticsPerformanceCharts } from "@/components/dashboard/analytics-performance-charts"
import { Apex50ConsistencyGauge } from "@/components/dashboard/apex-50-consistency-gauge"
import { DbTradeRow, fetchTrades, toDashboardTrade } from "@/lib/trade-store"
import { fetchPerformanceDaily, type PerformanceDailyRow } from "@/lib/performance-daily-store"

const STARTING_BALANCE = 50_000
const ALL_ACCOUNTS = "__all__"

const normAccount = (v: string | undefined | null) => String(v ?? "").trim().toLowerCase()

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<DbTradeRow[]>([])
  const [performanceDaily, setPerformanceDaily] = useState<PerformanceDailyRow[]>([])

  useEffect(() => {
    const load = async () => {
      const [rows, perf] = await Promise.all([
        fetchTrades().catch((e) => {
          console.error("[analytics] trades", e)
          return [] as DbTradeRow[]
        }),
        fetchPerformanceDaily().catch((e) => {
          console.error("[analytics] performance_daily", e)
          return [] as PerformanceDailyRow[]
        }),
      ])
      setTrades(Array.isArray(rows) ? rows : [])
      setPerformanceDaily(Array.isArray(perf) ? perf : [])
    }

    void load()

    const onTradesUpdated = () => {
      void load()
    }
    window.addEventListener("trades-updated", onTradesUpdated)
    return () => {
      window.removeEventListener("trades-updated", onTradesUpdated)
    }
  }, [])

  const accountIds = useMemo(() => {
    const set = new Set<string>()
    for (const row of trades) {
      const id = String(row.account ?? "").trim()
      if (id) set.add(id)
    }
    for (const row of performanceDaily) {
      const id = String(row.account ?? "").trim()
      if (id) set.add(id)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [trades, performanceDaily])

  const [selectedAccount, setSelectedAccount] = useState<string>(ALL_ACCOUNTS)

  useEffect(() => {
    if (selectedAccount === ALL_ACCOUNTS) return
    if (accountIds.length === 0) {
      setSelectedAccount(ALL_ACCOUNTS)
      return
    }
    const selectedNorm = normAccount(selectedAccount)
    if (!accountIds.some((id) => normAccount(id) === selectedNorm)) {
      setSelectedAccount(accountIds[0] ?? ALL_ACCOUNTS)
    }
  }, [accountIds, selectedAccount])

  const filteredDbTrades = useMemo(() => {
    if (selectedAccount === ALL_ACCOUNTS) return trades
    const want = normAccount(selectedAccount)
    return trades.filter((row) => normAccount(row.account) === want)
  }, [trades, selectedAccount])

  const filteredPerformanceDaily = useMemo(() => {
    if (selectedAccount === ALL_ACCOUNTS) return performanceDaily
    const want = normAccount(selectedAccount)
    return performanceDaily.filter((row) => normAccount(row.account) === want)
  }, [performanceDaily, selectedAccount])

  const accountBalance = useMemo(() => {
    const dashboardTrades = filteredDbTrades.map(toDashboardTrade)
    return STARTING_BALANCE + dashboardTrades.reduce((sum, t) => sum + t.netPnL, 0)
  }, [filteredDbTrades])

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <Header />
        <main className="p-3 md:p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-3">
              <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                <label
                  htmlFor="analytics-account"
                  className="text-[10px] font-medium uppercase tracking-wide text-zinc-500"
                >
                  Account (Performance data)
                </label>
                <select
                  id="analytics-account"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#1A1A1A] bg-[#050505] px-2 py-2 text-sm text-white shadow-sm focus:border-[#00F081] focus:outline-none focus:ring-1 focus:ring-[#00F081]/40"
                >
                  <option value={ALL_ACCOUNTS}>All accounts</option>
                  {accountIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Charts use imported Performance / fill rows (Net P/L, Timestamp). Balance for
                  reference: {accountBalance.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </p>
              </div>

              <Apex50ConsistencyGauge
                trades={filteredDbTrades}
                performanceDaily={performanceDaily}
                performanceAccount={selectedAccount === ALL_ACCOUNTS ? null : selectedAccount}
                inactiveMessage={
                  selectedAccount === ALL_ACCOUNTS
                    ? "Select a single account to see how filtered Performance data affects payout readiness."
                    : undefined
                }
              />
            </div>

            <div className="space-y-6 xl:col-span-9">
              <AnalyticsPerformanceCharts trades={filteredDbTrades} />
              <AdvancedAnalytics
                key={selectedAccount}
                trades={filteredDbTrades}
                accountFilterActive={selectedAccount !== ALL_ACCOUNTS}
              />
              <AnalyticsCalendar
                trades={filteredDbTrades}
                performanceDaily={filteredPerformanceDaily}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
