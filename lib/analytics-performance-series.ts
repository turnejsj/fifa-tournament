import { DbTradeRow } from "@/lib/trade-store"

/** Parse Performance / export `trade_date` as epoch ms for sorting and axes. */
export function parsePerformanceTimestamp(tradeDate: string): number {
  const parsed = new Date(tradeDate)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

export function formatPerformanceAxisLabel(ts: number): string {
  if (!ts) return ""
  const d = new Date(ts)
  return d.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Cumulative Net P/L over time (Performance CSV: Timestamp → X, Net P/L → Y).
 * Uses each row's `net_pnl` (fees included as reported in the Performance export).
 */
export function buildCumulativePnlWithFeesSeries(rows: DbTradeRow[]) {
  const sorted = [...rows].sort(
    (a, b) => parsePerformanceTimestamp(a.trade_date) - parsePerformanceTimestamp(b.trade_date)
  )

  let cumulative = 0
  return sorted.map((row) => {
    const net = Number(row.net_pnl ?? 0)
    cumulative += net
    const ts = parsePerformanceTimestamp(row.trade_date)
    return {
      timestampMs: ts,
      timestampLabel: formatPerformanceAxisLabel(ts),
      netPnl: net,
      cumulativeWithFees: cumulative,
    }
  })
}

/** Aggregate Net P/L by hour-of-day (0–23) from each row's Timestamp. */
/**
 * End-of-day cumulative Net P/L (histogram-friendly: one bar per calendar day).
 */
export function buildDailyCumulativeHistogram(rows: DbTradeRow[]) {
  const dayNet = new Map<string, number>()
  for (const row of rows) {
    const raw = String(row.trade_date ?? "").trim()
    const dayKey = raw.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue
    const net = Number(row.net_pnl ?? 0)
    if (!Number.isFinite(net)) continue
    dayNet.set(dayKey, (dayNet.get(dayKey) ?? 0) + net)
  }

  const days = [...dayNet.keys()].sort((a, b) => a.localeCompare(b))
  let cumulative = 0
  return days.map((day) => {
    const dNet = dayNet.get(day) ?? 0
    cumulative += dNet
    const ts = parsePerformanceTimestamp(`${day}T12:00:00`)
    return {
      day,
      dayLabel: day.slice(5),
      dayNet: dNet,
      cumulativeWithFees: cumulative,
      timestampMs: ts,
      timestampLabel: formatPerformanceAxisLabel(ts),
    }
  })
}

export function buildPnlPerHourOfDay(rows: DbTradeRow[]) {
  const map = new Map<number, number>()
  for (let h = 0; h < 24; h += 1) map.set(h, 0)

  for (const row of rows) {
    const d = new Date(row.trade_date)
    if (Number.isNaN(d.getTime())) continue
    const hour = d.getHours()
    const net = Number(row.net_pnl ?? 0)
    map.set(hour, (map.get(hour) ?? 0) + net)
  }

  return Array.from(map.entries()).map(([hour, pnl]) => ({
    hour,
    hourLabel:
      hour === 0
        ? "12a"
        : hour < 12
          ? `${hour}a`
          : hour === 12
            ? "12p"
            : `${hour - 12}p`,
    pnl,
  }))
}
