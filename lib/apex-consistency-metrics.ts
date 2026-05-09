import { DbTradeRow } from "@/lib/trade-store"
import type { PerformanceDailyRow } from "@/lib/performance-daily-store"

export const NEON_GREEN = "#00F081"
export const NEON_RED = "#FF4D4D"

export function normalizeTradeDateKey(value: string) {
  const isoPrefix = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (isoPrefix) return isoPrefix
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, "0")
    const day = String(parsed.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  return value
}

export interface ApexConsistencyOptions {
  /** Daily net totals from Performance CSV (Supabase `performance_daily`). */
  performanceDaily?: PerformanceDailyRow[] | null
  /** When set, only performance rows for this account; otherwise all rows are merged by calendar day. */
  performanceAccount?: string | null
}

/**
 * Apex 50% rule: no single day's profit may exceed 50% of total profit.
 * Uses Performance daily totals when present; otherwise trade-level P&amp;L.
 */
export function computeApex50Consistency(trades: DbTradeRow[], options?: ApexConsistencyOptions) {
  const perfIn = options?.performanceDaily ?? []
  const acct = options?.performanceAccount

  let perfRows = perfIn
  if (acct) {
    perfRows = perfIn.filter((p) => p.account === acct)
  }

  let totalProfit: number
  const byDay = new Map<string, number>()

  if (perfRows.length > 0) {
    for (const p of perfRows) {
      byDay.set(p.day, (byDay.get(p.day) ?? 0) + p.net_total)
    }
    totalProfit = [...byDay.values()].reduce((s, v) => s + v, 0)
  } else {
    totalProfit = trades.reduce((sum, t) => sum + Number(t.net_pnl ?? 0), 0)
    for (const t of trades) {
      const key = normalizeTradeDateKey(t.trade_date)
      byDay.set(key, (byDay.get(key) ?? 0) + Number(t.net_pnl ?? 0))
    }
  }

  /** Largest single-day *profit* (green days only); drives Apex 50% rule with Performance CSV. */
  const winningDayPnls = [...byDay.values()].filter((v) => v > 0)
  const highestDayProfit =
    winningDayPnls.length > 0 ? Math.max(...winningDayPnls) : 0

  const requiredTotalProfit = highestDayProfit / 0.5
  const remainingToConsistency = requiredTotalProfit - totalProfit
  const passedConsistency = remainingToConsistency <= 0
  const consistencyTarget = highestDayProfit * 2
  const consistencyTargetProgressPct =
    consistencyTarget > 0 ? Math.max(0, Math.min(100, (totalProfit / consistencyTarget) * 100)) : 0
  const consistencyTargetMet = totalProfit > consistencyTarget

  const consistencyPct =
    totalProfit > 0 && highestDayProfit > 0 ? (highestDayProfit / totalProfit) * 100 : 0

  const gaugeFillPct = Math.max(0, Math.min(100, consistencyPct))
  const consistencyOver50 = consistencyPct > 50
  const gaugeColor = consistencyOver50 ? NEON_RED : NEON_GREEN

  return {
    totalProfit,
    highestDayProfit,
    consistencyTarget,
    consistencyTargetProgressPct,
    consistencyTargetMet,
    remainingToConsistency,
    passedConsistency,
    consistencyPct,
    gaugeFillPct,
    gaugeColor,
    consistencyOver50,
  }
}
