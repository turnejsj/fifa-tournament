"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { DbTradeRow } from "@/lib/trade-store"
import type { PerformanceDailyRow } from "@/lib/performance-daily-store"
import { parseUsSlashDateTime, toCalendarDayKey } from "@/lib/trade-timestamps"

interface AnalyticsCalendarProps {
  /** Order fills for intraday detail when a day is selected. */
  trades?: DbTradeRow[]
  /**
   * Daily nets from `public.performance_daily` (Performance CSV → Supabase).
   * When non-empty, the calendar cells use these values instead of summing `trades`.
   */
  performanceDaily?: PerformanceDailyRow[]
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DEFAULT_CALENDAR_MONTH = new Date(2026, 3, 1) // April 2026

const formatCurrency = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

const normalizeTradeDate = (value: string): string => {
  if (!value || typeof value !== "string") return ""
  const trimmed = value.trim()
  const isoPrefix = trimmed.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (isoPrefix) return isoPrefix

  const us = parseUsSlashDateTime(trimmed)
  if (us) return toCalendarDayKey(us)

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return toCalendarDayKey(parsed)

  return ""
}

const safeNetPnl = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

type DaySummary = {
  pnl: number
  trades: DbTradeRow[]
  /** True when `pnl` comes from `performance_daily` (not summed fills). */
  fromPerformanceDaily: boolean
}

export function AnalyticsCalendar({
  trades = [],
  performanceDaily = [],
}: AnalyticsCalendarProps) {
  const normalizedTrades = useMemo(
    () =>
      (Array.isArray(trades) ? trades : [])
        .filter((t) => t && typeof t.trade_date === "string")
        .map((trade) => ({
          ...trade,
          normalizedDate: normalizeTradeDate(trade.trade_date),
        }))
        .filter((t) => DAY_KEY_RE.test(t.normalizedDate)),
    [trades]
  )

  const normalizedPerformance = useMemo(() => {
    const list = Array.isArray(performanceDaily) ? performanceDaily : []
    return list.filter(
      (r) =>
        r &&
        typeof r.day === "string" &&
        DAY_KEY_RE.test(r.day.trim()) &&
        String(r.account ?? "").trim() !== ""
    )
  }, [performanceDaily])

  const usePerformanceCalendar = normalizedPerformance.length > 0

  const [currentMonth, setCurrentMonth] = useState(DEFAULT_CALENDAR_MONTH)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const dailySummary = useMemo(() => {
    const summary = new Map<string, DaySummary>()
    if (usePerformanceCalendar) {
      for (const row of normalizedPerformance) {
        const key = row.day.trim()
        if (!DAY_KEY_RE.test(key)) continue
        const existing = summary.get(key) ?? {
          pnl: 0,
          trades: [],
          fromPerformanceDaily: true,
        }
        existing.pnl += safeNetPnl(row.net_total)
        existing.fromPerformanceDaily = true
        summary.set(key, existing)
      }
      return summary
    }

    for (const trade of normalizedTrades) {
      const key = trade.normalizedDate
      const existing = summary.get(key) ?? {
        pnl: 0,
        trades: [],
        fromPerformanceDaily: false,
      }
      existing.pnl += safeNetPnl(trade.net_pnl)
      existing.trades.push(trade)
      summary.set(key, existing)
    }
    return summary
  }, [normalizedTrades, normalizedPerformance, usePerformanceCalendar])

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()
  const firstDayOffset = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const monthLabel = currentMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }).map((_, idx) => {
      const day = idx + 1
      const key = `${currentMonth.getFullYear()}-${String(
        currentMonth.getMonth() + 1
      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      return { day, key, summary: dailySummary.get(key) }
    })
  }, [currentMonth, daysInMonth, dailySummary])

  useEffect(() => {
    const firstDayWithTrades = days.find((d) => d.summary)?.key ?? days[0]?.key ?? null
    setSelectedDate(firstDayWithTrades)
  }, [days])

  const selectedDayTrades = selectedDate ? dailySummary.get(selectedDate)?.trades ?? [] : []

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]">
      <div className="flex flex-col gap-2 border-b border-[#1A1A1A] px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Analytics Calendar</h2>
          <p className="text-sm text-zinc-400">
            {usePerformanceCalendar
              ? "Daily net from Performance data (public.performance_daily)"
              : "Daily net P/L by trade date (order fills)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
            className="rounded-md border border-[#1A1A1A] px-2 py-1 text-sm text-zinc-300 hover:bg-[#111]"
          >
            Prev
          </button>
          <div className="min-w-28 text-center text-xs font-medium text-white md:min-w-36 md:text-sm">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
            className="rounded-md border border-[#1A1A1A] px-2 py-1 text-sm text-zinc-300 hover:bg-[#111]"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 p-2 md:gap-2 md:p-4">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-zinc-500 md:text-xs">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOffset }).map((_, idx) => (
          <div key={`spacer-${idx}`} className="h-16 rounded-md border border-[#111] md:h-24" />
        ))}

        {days.map(({ day, key, summary }) => {
          const hasSummary = Boolean(summary)
          const isProfit = (summary?.pnl ?? 0) >= 0
          const isSelected = selectedDate === key

          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedDate(key)}
              className={cn(
                "h-16 rounded-md border p-1 text-left transition-colors md:h-24 md:p-2",
                hasSummary
                  ? isProfit
                    ? "border-[#00F081]/40 bg-[#00F081]/15"
                    : "border-[#FF4D4D]/40 bg-[#FF4D4D]/15"
                  : "border-[#1A1A1A] bg-[#050505] hover:bg-[#111]",
                isSelected && "ring-2 ring-primary"
              )}
            >
              <div className="text-xs font-semibold text-white md:text-sm">{day}</div>
              {hasSummary && (
                <>
                  <div
                    className={cn(
                      "mt-0.5 text-[10px] font-semibold md:mt-1 md:text-sm",
                      isProfit ? "text-[#00F081]" : "text-[#FF4D4D]"
                    )}
                  >
                    {formatCurrency(summary!.pnl)}
                  </div>
                  <div className="text-[9px] text-zinc-400 md:text-xs">
                    {summary!.fromPerformanceDaily
                      ? "Performance"
                      : `${summary!.trades.length} trades`}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      <div className="border-t border-[#1A1A1A] p-4">
        <h3 className="mb-2 text-sm font-semibold text-white">
          {selectedDate
            ? usePerformanceCalendar
              ? `Performance net for ${selectedDate}`
              : `Trades for ${selectedDate}`
            : "Select a day"}
        </h3>
        {usePerformanceCalendar && selectedDate && selectedDayTrades.length === 0 ? (
          <div className="space-y-2 text-sm text-zinc-300">
            <p>
              Net P/L (aggregated in Supabase):{" "}
              <span className="font-semibold text-white">
                {formatCurrency(dailySummary.get(selectedDate)?.pnl ?? 0)}
              </span>
            </p>
            <p className="text-zinc-500">
              Per-fill detail lives under Orders upload (trades table). Upload Performance CSV to
              refresh these daily totals.
            </p>
          </div>
        ) : selectedDayTrades.length === 0 ? (
          <p className="text-sm text-zinc-400">No trades for this day.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#1A1A1A]">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#111]">
                <tr>
                  <th className="px-3 py-2 text-left">Symbol</th>
                  <th className="px-3 py-2 text-left">Side</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Entry</th>
                  <th className="px-3 py-2 text-right">Net P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {selectedDayTrades.map((trade, idx) => (
                  <tr
                    key={String(
                      trade.id ?? trade.order_id ?? `${trade.symbol ?? "?"}-${trade.trade_date}-${idx}`
                    )}
                    className="border-t border-[#1A1A1A]"
                  >
                    <td className="px-3 py-2">{trade.symbol ?? "—"}</td>
                    <td className="px-3 py-2">{trade.side ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{safeNetPnl(trade.quantity)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(safeNetPnl(trade.entry_price))}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        safeNetPnl(trade.net_pnl) >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
                      )}
                    >
                      {formatCurrency(safeNetPnl(trade.net_pnl))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
