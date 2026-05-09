"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Trade } from "@/lib/trades"
import { supabase } from "@/lib/supabase-client"
import { DbTradeRow, toDashboardTrade } from "@/lib/trade-store"

const formatCurrency = (value: number) => {
  const prefix = value >= 0 ? "$" : "-$"
  return `${prefix}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface RecentTradesProps {
  trades?: Trade[]
  /** When set with `detailed`, shows full fill columns from Orders CSV / Supabase. */
  dbRows?: DbTradeRow[]
  detailed?: boolean
}

export function RecentTrades({ trades, dbRows, detailed }: RecentTradesProps) {
  const [activeTab, setActiveTab] = useState<"recent" | "open">("recent")
  const [fetchedTrades, setFetchedTrades] = useState<Trade[]>([])

  const useDetailed = Boolean(detailed && dbRows && dbRows.length > 0)

  useEffect(() => {
    if (useDetailed) return
    if (trades && trades.length > 0) return

    const loadRecentTrades = async () => {
      const primary = await supabase
        .from("trades")
        .select(
          "id, order_id, trade_date, symbol, side, quantity, entry_price, exit_price, net_pnl, account, mistake_tag, commission, created_at"
        )
        .order("trade_date", { ascending: false })
        .limit(200)

      if (!primary.error) {
        setFetchedTrades(((primary.data ?? []) as DbTradeRow[]).map(toDashboardTrade))
        return
      }

      const fallback = await supabase
        .from("trades")
        .select(
          "id, order_id, trade_date, symbol, side, quantity, entry_price, exit_price, net_pnl, account, commission, created_at"
        )
        .order("trade_date", { ascending: false })
        .limit(200)

      if (fallback.error) {
        console.error("Failed to fetch recent trades:", fallback.error)
        return
      }

      setFetchedTrades(((fallback.data ?? []) as DbTradeRow[]).map(toDashboardTrade))
    }

    void loadRecentTrades()
  }, [trades, useDetailed, dbRows])

  const tradesToDisplay = useMemo(() => {
    const source = trades && trades.length > 0 ? trades : fetchedTrades
    return [...source].sort((a, b) => {
      return new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
    })
  }, [trades, fetchedTrades])

  const dbRowsSorted = useMemo(() => {
    if (!dbRows?.length) return []
    return [...dbRows].sort(
      (a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
    )
  }, [dbRows])

  const noTrades = useDetailed ? dbRowsSorted.length === 0 : tradesToDisplay.length === 0

  const isUsingFallbackData = !useDetailed && (!trades || trades.length === 0) && fetchedTrades.length > 0

  const tabActive = "border-b-2 border-[#00F081] text-white"
  const tabIdle = "text-zinc-500 hover:text-zinc-200"

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#050505]">
      <div className="flex border-b border-[#1A1A1A] bg-[#0D0D0D]">
        <button
          type="button"
          onClick={() => setActiveTab("recent")}
          className={cn(
            "px-3 py-2 text-xs font-medium transition-colors md:px-4 md:py-3 md:text-sm",
            activeTab === "recent" ? tabActive : tabIdle
          )}
        >
          {useDetailed ? "DETAILED TRADES" : "RECENT TRADES"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("open")}
          className={cn(
            "px-3 py-2 text-xs font-medium transition-colors md:px-4 md:py-3 md:text-sm",
            activeTab === "open" ? tabActive : tabIdle
          )}
        >
          OPEN POSITIONS
        </button>
      </div>

      <div className="overflow-x-auto bg-[#050505]">
        {activeTab === "recent" && useDetailed ? (
          <table className="w-full min-w-[680px] md:min-w-[720px]">
            <thead>
              <tr className="border-b border-[#1A1A1A] bg-[#0D0D0D] text-left">
                <th className="sticky left-0 z-10 bg-[#0D0D0D] px-3 py-3 text-xs font-medium text-zinc-400 md:px-4">
                  Date / time
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400">Symbol</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400">Side</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Entry</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Exit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Net P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {noTrades ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500" colSpan={7}>
                    Upload an Orders CSV to see fills here.
                  </td>
                </tr>
              ) : (
                dbRowsSorted.map((row) => (
                  <tr
                    key={row.order_id}
                    className="border-b border-[#1A1A1A] bg-[#050505] last:border-0 hover:bg-[#0D0D0D]"
                  >
                    <td className="sticky left-0 z-[1] bg-[#050505] px-3 py-3 text-xs text-white md:px-4 md:text-sm">
                      {row.trade_date}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{row.symbol}</td>
                    <td className="px-4 py-3 text-sm text-white">{row.side}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">{row.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">
                      {formatCurrency(Number(row.entry_price))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">
                      {row.exit_price != null ? formatCurrency(Number(row.exit_price)) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right text-sm font-medium",
                        Number(row.net_pnl) >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
                      )}
                    >
                      {formatCurrency(Number(row.net_pnl))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : activeTab === "recent" ? (
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-[#1A1A1A] bg-[#0D0D0D] text-left">
                <th className="sticky left-0 z-10 bg-[#0D0D0D] px-3 py-3 text-xs font-medium text-zinc-400 md:px-4">
                  Close Date
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400">Symbol</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {noTrades ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500" colSpan={3}>
                    No trades loaded yet.
                  </td>
                </tr>
              ) : (
                tradesToDisplay.map((trade, index) => (
                  <tr
                    key={index}
                    className="border-b border-[#1A1A1A] bg-[#050505] last:border-0 hover:bg-[#0D0D0D]"
                  >
                    <td className="sticky left-0 z-[1] bg-[#050505] px-3 py-3 text-xs text-white md:px-4 md:text-sm">
                      {trade.closeDate}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{trade.symbol}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right text-sm font-medium",
                        trade.netPnL >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
                      )}
                    >
                      {formatCurrency(trade.netPnL)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            Open positions require a live broker feed (not available from CSV import).
          </div>
        )}
      </div>

      <div className="border-t border-[#1A1A1A] bg-[#0D0D0D] px-4 py-2">
        {useDetailed ? (
          <span className="text-sm text-[#00F081]">Orders CSV fills populate this table and hourly P&amp;L.</span>
        ) : (
          <button type="button" className="text-sm text-[#00F081] hover:underline">
            View More
          </button>
        )}
        {isUsingFallbackData && (
          <span className="ml-3 text-xs text-zinc-500">Loaded via resilient fetch fallback.</span>
        )}
      </div>
    </div>
  )
}
