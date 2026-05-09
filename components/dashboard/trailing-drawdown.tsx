"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { DbTradeRow } from "@/lib/trade-store"

function tradeMaxRunupDollars(t: DbTradeRow): number {
  const raw = t.max_runup
  if (raw !== undefined && raw !== null) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  const pnl = Number(t.net_pnl ?? 0)
  return Math.max(0, pnl)
}

interface TrailingDrawdownProps {
  trades: DbTradeRow[]
  startingBalance?: number
  /** Max allowed drop from peak balance (e.g. $2,500 trailing) */
  allowedTrailingDrawdown?: number
  /** Closed-book balance + open P&L when you have it; defaults to sum of closed trades from `trades`. */
  currentBalance?: number
  /**
   * Max favorable excursion on the **current** open position (dollars). Should be the session high;
   * the component also keeps an internal peak so a shrinking live value does not pull HWM down.
   */
  currentTradeMaxRunup?: number
  /** When set, show inactive state (e.g. “All accounts” selected). */
  inactiveMessage?: string
}

const formatMoney = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export function TrailingDrawdown({
  trades,
  startingBalance = 50000,
  allowedTrailingDrawdown = 2500,
  currentBalance: currentBalanceProp,
  currentTradeMaxRunup: currentTradeMaxRunupProp = 0,
  inactiveMessage,
}: TrailingDrawdownProps) {
  const sortedKey = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) =>
        new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    )
    const last = sorted[sorted.length - 1]
    return `${sorted.length}:${last?.order_id ?? ""}:${last?.trade_date ?? ""}`
  }, [trades])

  const [openRunupSessionPeak, setOpenRunupSessionPeak] = useState(0)

  useEffect(() => {
    setOpenRunupSessionPeak(0)
  }, [sortedKey])

  useEffect(() => {
    const v = Number(currentTradeMaxRunupProp)
    if (!Number.isFinite(v) || v <= 0) return
    setOpenRunupSessionPeak((prev) => Math.max(prev, v))
  }, [currentTradeMaxRunupProp])

  const liveOpenRunup = Math.max(
    0,
    Number.isFinite(currentTradeMaxRunupProp) ? currentTradeMaxRunupProp : 0,
    openRunupSessionPeak
  )

  const model = useMemo(() => {
    if (inactiveMessage) {
      return "inactive" as const
    }

    const sorted = [...trades].sort(
      (a, b) =>
        new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    )

    let closedBalance = startingBalance
    let hwm = startingBalance

    for (const t of sorted) {
      const pnl = Number(t.net_pnl ?? 0)
      const maxRun = tradeMaxRunupDollars(t)
      hwm = Math.max(hwm, closedBalance + maxRun)
      closedBalance += pnl
      hwm = Math.max(hwm, closedBalance)
    }

    const openPeak = closedBalance + liveOpenRunup
    const intraDayHwm = Math.max(hwm, openPeak)

    const current =
      currentBalanceProp !== undefined && Number.isFinite(currentBalanceProp)
        ? currentBalanceProp
        : closedBalance

    const floor = intraDayHwm - allowedTrailingDrawdown
    const buffer = current - floor

    const stressPct = Math.min(
      100,
      Math.max(0, ((allowedTrailingDrawdown - buffer) / allowedTrailingDrawdown) * 100)
    )

    return {
      intraDayHwm,
      closedBalance,
      current,
      floor,
      buffer,
      stressPct,
    }
  }, [
    trades,
    startingBalance,
    allowedTrailingDrawdown,
    inactiveMessage,
    currentBalanceProp,
    liveOpenRunup,
  ])

  if (inactiveMessage || model === "inactive") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <div className="absolute right-3 top-3 rounded border border-[#00F081]/40 bg-[#00F081]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00F081]">
          Pro
        </div>
      <div className="mb-2 pr-14 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Trailing Drawdown
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {inactiveMessage ??
            "No trades for this account yet. Import or select an account with history."}
        </p>
      </div>
    )
  }

  const buffer = model.buffer
  const barColor =
    buffer < 500 ? "#FF4D4D" : buffer < 1000 ? "#f59e0b" : "#00F081"
  const barPulse = buffer < 500

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <div className="absolute right-3 top-3 rounded border border-[#00F081]/40 bg-[#00F081]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00F081]">
        Pro
      </div>
      <div className="mb-3 pr-14 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Trailing Drawdown
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
        Intra-day high water mark uses each trade&apos;s max run-up (not just closed net PnL)
        plus any open trade run-up you pass in. Floor is ${allowedTrailingDrawdown.toLocaleString("en-US")}{" "}
        below that HWM and only moves up with new highs. Orange bar if buffer under $1,000; pulsing
        red under $500.
      </p>

      <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-[#050505] ring-1 ring-[#1A1A1A]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barPulse && "animate-pulse"
          )}
          style={{
            width: `${model.stressPct}%`,
            backgroundColor: barColor,
            boxShadow:
              buffer < 1000
                ? "0 0 12px rgba(255,77,77,0.35)"
                : "0 0 10px rgba(0,240,129,0.25)",
          }}
        />
      </div>

      <div className="mb-3 flex justify-between text-[10px] text-zinc-500">
        <span>Safe</span>
        <span>Floor</span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Intra-day High Water Mark</span>
          <span className="font-semibold text-white">{formatMoney(model.intraDayHwm)}</span>
        </div>
        <div className="flex justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Threshold (floor)</span>
          <span
            className={cn(
              "font-semibold",
              buffer <= 0 ? "text-[#FF4D4D]" : "text-[#FF4D4D]/90"
            )}
          >
            {formatMoney(model.floor)}
          </span>
        </div>
        <div className="flex justify-between rounded-md border border-[#1A1A1A] px-2 py-1.5">
          <span className="text-zinc-400">Current balance</span>
          <span className="font-semibold text-white">{formatMoney(model.current)}</span>
        </div>
        <div className="flex justify-between text-[11px] text-zinc-500">
          <span>Buffer above floor</span>
          <span
            className={cn(
              "font-medium",
              buffer < 500
                ? "text-[#FF4D4D]"
                : buffer < 1000
                  ? "text-[#f59e0b]"
                  : "text-[#00F081]"
            )}
          >
            {formatMoney(buffer)}
          </span>
        </div>
      </div>
    </div>
  )
}
