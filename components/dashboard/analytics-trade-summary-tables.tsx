"use client"

import { useMemo, type ReactNode } from "react"
import type { DbTradeRow } from "@/lib/trade-store"

/** Same shape as `normalizedTrades` inside `AdvancedAnalytics` (Orders / DB fills). */
export type NormalizedAnalyticsTrade = DbTradeRow & {
  netPnl: number
  quantity: number
  durationMinutes: number | null
}

/** $1,234.56 or $(1,234.56) for negative values. */
function formatCurrencyParen(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (value < 0) return `($${abs})`
  return `$${abs}`
}

function formatDurationMinutes(m: number | null): string {
  if (m === null || !Number.isFinite(m) || m <= 0) return "—"
  if (m < 60) return `${m.toFixed(1)}m`
  const h = Math.floor(m / 60)
  const rem = m - h * 60
  return `${h}h ${rem.toFixed(0)}m`
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 19)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function sortChronological(rows: NormalizedAnalyticsTrade[]): NormalizedAnalyticsTrade[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.trade_date).getTime()
    const tb = new Date(b.trade_date).getTime()
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0
    return ca - cb
  })
}

function maxWinStreak(rows: NormalizedAnalyticsTrade[]): { amount: number; at: string } {
  let cur = 0
  let best = 0
  let bestAt = ""
  for (const t of rows) {
    if (t.netPnl > 0) {
      cur += t.netPnl
      if (cur > best) {
        best = cur
        bestAt = t.trade_date
      }
    } else {
      cur = 0
    }
  }
  return { amount: best, at: bestAt }
}

function maxLossStreakAbs(rows: NormalizedAnalyticsTrade[]): { amount: number; at: string } {
  let cur = 0
  let best = 0
  let bestAt = ""
  for (const t of rows) {
    if (t.netPnl < 0) {
      cur += Math.abs(t.netPnl)
      if (cur > best) {
        best = cur
        bestAt = t.trade_date
      }
    } else {
      cur = 0
    }
  }
  return { amount: best, at: bestAt }
}

function SummaryLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-[#1A1A1A]/70 py-2 last:border-0">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-white">{children}</div>
    </div>
  )
}

interface AnalyticsTradeSummaryTablesProps {
  normalizedTrades: NormalizedAnalyticsTrade[]
  /** When true and there are no fills, show a hint (account may only exist on Performance data). */
  accountFilterActive?: boolean
}

export function AnalyticsTradeSummaryTables({
  normalizedTrades,
  accountFilterActive = false,
}: AnalyticsTradeSummaryTablesProps) {
  const model = useMemo(() => {
    const list = Array.isArray(normalizedTrades) ? normalizedTrades : []
    const sorted = sortChronological(list)

    const grossPnl = sorted.reduce((s, t) => s + t.netPnl, 0)
    const n = sorted.length
    const contracts = sorted.reduce((s, t) => s + (Number.isFinite(t.quantity) ? t.quantity : 0), 0)
    const wins = sorted.filter((t) => t.netPnl > 0)
    const losses = sorted.filter((t) => t.netPnl < 0)
    const pctProfitable = n > 0 ? (wins.length / n) * 100 : 0
    const expectancy = n > 0 ? grossPnl / n : 0

    const durations = sorted
      .map((t) => t.durationMinutes)
      .filter((m): m is number => m !== null && Number.isFinite(m) && m > 0)
    const avgDur =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null
    const longestDur = durations.length > 0 ? Math.max(...durations) : null

    const totalProfit = wins.reduce((s, t) => s + t.netPnl, 0)
    const totalLoss = losses.reduce((s, t) => s + t.netPnl, 0)
    const largestWin =
      wins.length > 0 ? wins.reduce((best, t) => (t.netPnl > best.netPnl ? t : best), wins[0]!) : null
    const largestLoss =
      losses.length > 0
        ? losses.reduce((worst, t) => (t.netPnl < worst.netPnl ? t : worst), losses[0]!)
        : null
    const avgWin = wins.length > 0 ? totalProfit / wins.length : 0
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0

    const runUp = maxWinStreak(sorted)
    const drawStreak = maxLossStreakAbs(sorted)

    return {
      grossPnl,
      n,
      contracts,
      avgDur,
      longestDur,
      pctProfitable,
      expectancy,
      totalProfit,
      totalLoss,
      largestWin,
      largestLoss,
      avgWin,
      avgLoss,
      runUp,
      drawStreak,
      winCount: wins.length,
      lossCount: losses.length,
    }
  }, [normalizedTrades])

  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Trade summaries
      </h3>
      {accountFilterActive && model.n === 0 && (
        <p className="mb-3 rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] px-3 py-2 text-[11px] text-zinc-500">
          No order fills for this account in the database yet. Upload an Orders CSV that includes
          this account ID, or pick another account.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* All Trades */}
        <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4 text-white">
          <h4 className="mb-2 border-b border-[#1A1A1A] pb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
            All Trades
          </h4>
          <div>
            <SummaryLine label="Gross P/L">{formatCurrencyParen(model.grossPnl)}</SummaryLine>
            <SummaryLine label="# of Trades">{model.n.toLocaleString("en-US")}</SummaryLine>
            <SummaryLine label="# of Contracts">
              {model.contracts.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </SummaryLine>
            <SummaryLine label="Avg / Longest Trade Time">
              <span className="text-zinc-300">
                {formatDurationMinutes(model.avgDur)} <span className="text-zinc-600">/</span>{" "}
                {formatDurationMinutes(model.longestDur)}
              </span>
            </SummaryLine>
            <SummaryLine label="% Profitable">{model.pctProfitable.toFixed(1)}%</SummaryLine>
            <SummaryLine label="Expectancy">{formatCurrencyParen(model.expectancy)}</SummaryLine>
          </div>
        </div>

        {/* Profit Trades */}
        <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4 text-white">
          <h4 className="mb-2 border-b border-[#1A1A1A] pb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
            Profit Trades
          </h4>
          <div>
            <SummaryLine label="Total Profit">
              <span className="text-[#00F081]">{formatCurrencyParen(model.totalProfit)}</span>
            </SummaryLine>
            <SummaryLine label="Largest Win">
              {model.largestWin ? (
                <>
                  <span className="text-[#00F081]">{formatCurrencyParen(model.largestWin.netPnl)}</span>
                  <div className="mt-1 text-[11px] font-normal text-zinc-500">
                    {formatTimestamp(model.largestWin.trade_date)}
                  </div>
                </>
              ) : (
                "—"
              )}
            </SummaryLine>
            <SummaryLine label="Avg Win">
              {model.winCount > 0 ? (
                <span className="text-[#00F081]">{formatCurrencyParen(model.avgWin)}</span>
              ) : (
                "—"
              )}
            </SummaryLine>
            <SummaryLine label="Max Run-up">
              {model.runUp.amount > 0 ? (
                <>
                  <span className="text-[#00F081]">{formatCurrencyParen(model.runUp.amount)}</span>
                  <div className="mt-1 text-[11px] font-normal text-zinc-500">
                    {model.runUp.at ? formatTimestamp(model.runUp.at) : "—"}
                  </div>
                </>
              ) : (
                "—"
              )}
            </SummaryLine>
          </div>
        </div>

        {/* Losing Trades */}
        <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4 text-white">
          <h4 className="mb-2 border-b border-[#1A1A1A] pb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
            Losing Trades
          </h4>
          <div>
            <SummaryLine label="Total Loss">
              <span className="text-[#FF4D4D]">{formatCurrencyParen(model.totalLoss)}</span>
            </SummaryLine>
            <SummaryLine label="Largest Loss">
              {model.largestLoss ? (
                <>
                  <span className="text-[#FF4D4D]">{formatCurrencyParen(model.largestLoss.netPnl)}</span>
                  <div className="mt-1 text-[11px] font-normal text-zinc-500">
                    {formatTimestamp(model.largestLoss.trade_date)}
                  </div>
                </>
              ) : (
                "—"
              )}
            </SummaryLine>
            <SummaryLine label="Avg Loss">
              {model.lossCount > 0 ? (
                <span className="text-[#FF4D4D]">{formatCurrencyParen(model.avgLoss)}</span>
              ) : (
                "—"
              )}
            </SummaryLine>
            <SummaryLine label="Max Drawdown">
              {model.drawStreak.amount > 0 ? (
                <>
                  <span className="text-[#FF4D4D]">{formatCurrencyParen(-model.drawStreak.amount)}</span>
                  <div className="mt-1 text-[11px] font-normal text-zinc-500">
                    {model.drawStreak.at ? formatTimestamp(model.drawStreak.at) : "—"}
                  </div>
                </>
              ) : (
                "—"
              )}
            </SummaryLine>
          </div>
        </div>
      </div>
    </section>
  )
}
