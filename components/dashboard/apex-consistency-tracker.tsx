"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { DbTradeRow } from "@/lib/trade-store"
import type { PerformanceDailyRow } from "@/lib/performance-daily-store"
import { computeApex50Consistency } from "@/lib/apex-consistency-metrics"

/** Apex 2026 payout corridor: balance must reach payout target after safety net. */
const DEFAULT_SAFETY_NET = 50_100
const DEFAULT_PAYOUT_TARGET = 52_600

interface ApexConsistencyTrackerProps {
  trades: DbTradeRow[]
  accountBalance: number
  inactiveMessage?: string
  performanceDaily?: PerformanceDailyRow[] | null
  /** Account used to filter `performanceDaily` for the 50% rule (omit when inactive). */
  performanceAccount?: string | null
  /** Floor of the payout-path bar (default $50,100). */
  safetyNet?: number
  /** End of the payout-path bar / balance needed for full payout path (default $52,600). */
  payoutTarget?: number
}

const formatMoney = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export function ApexConsistencyTracker({
  trades,
  accountBalance,
  inactiveMessage,
  performanceDaily,
  performanceAccount,
  safetyNet = DEFAULT_SAFETY_NET,
  payoutTarget = DEFAULT_PAYOUT_TARGET,
}: ApexConsistencyTrackerProps) {
  const model = useMemo(() => {
    if (inactiveMessage) return null

    const c = computeApex50Consistency(trades, {
      performanceDaily,
      performanceAccount: performanceAccount ?? null,
    })
    const {
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
    } = c

    const corridorSpan = payoutTarget - safetyNet
    const balanceProgressRaw =
      corridorSpan > 0 ? ((accountBalance - safetyNet) / corridorSpan) * 100 : 0
    const balanceProgressPct = Math.max(0, Math.min(100, balanceProgressRaw))

    const profitRemainingUntilPayout = Math.max(0, payoutTarget - accountBalance)

    const withdrawalEnabled = passedConsistency && accountBalance >= payoutTarget

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
      withdrawalEnabled,
      balanceProgressPct,
      profitRemainingUntilPayout,
    }
  }, [
    trades,
    inactiveMessage,
    safetyNet,
    payoutTarget,
    accountBalance,
    performanceDaily,
    performanceAccount,
  ])

  if (!model) {
    return (
      <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Payout Path
        </div>
        <p className="text-[10px] uppercase tracking-wide text-zinc-600">Apex 2026</p>
        <p className="mt-2 text-[11px] text-zinc-500">
          {inactiveMessage ?? "Select one account to evaluate Apex 2026 payout path."}
        </p>
      </div>
    )
  }

  const radius = 64
  const stroke = 11
  const normalizedRadius = radius - stroke / 2
  const arcLength = Math.PI * normalizedRadius
  const fillLength = (model.gaugeFillPct / 100) * arcLength

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Payout Path
      </div>
      <p className="mb-4 text-[10px] uppercase tracking-wide text-zinc-600">Apex 2026</p>

      {/* Cash-out / profit remaining */}
      <div className="mb-5 rounded-lg border border-[#1A1A1A] bg-[#0a0a0a] px-3 py-4 text-center">
        <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Profit Remaining until Payout
        </div>
        <div className="mt-1 font-black tabular-nums tracking-tight text-[#00F081] [text-shadow:0_0_24px_rgba(0,240,129,0.25)] text-3xl sm:text-4xl">
          {formatMoney(model.profitRemainingUntilPayout)}
        </div>
      </div>

      {/* $2,600 rule: balance path from safety net to payout target */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-500">
          <span>$2,600 Rule</span>
          <span className="font-mono text-zinc-400">{formatMoney(accountBalance)}</span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-[#1A1A1A]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#00F081] transition-all duration-500 [box-shadow:0_0_12px_rgba(0,240,129,0.35)]"
            style={{ width: `${model.balanceProgressPct}%` }}
            aria-hidden
          />
          <div
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0D0D0D] bg-[#00F081] shadow-[0_0_10px_rgba(0,240,129,0.6)] transition-all duration-500"
            style={{ left: `${model.balanceProgressPct}%` }}
            title={`Balance ${formatMoney(accountBalance)}`}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-500">
          <span>
            <span className="text-zinc-600">Safety Net </span>
            {formatMoney(safetyNet)}
          </span>
          <span>
            <span className="text-zinc-600">Payout Target </span>
            {formatMoney(payoutTarget)}
          </span>
        </div>
      </div>

      {/* 50% consistency: highest day / total profit */}
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Consistency (50% rule)
      </div>
      <div className="mb-3 flex items-center justify-center">
        <svg width="150" height="86" viewBox="0 0 150 86" aria-hidden>
          <path
            d={`M ${radius - normalizedRadius + 11} 75 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius + normalizedRadius + 11} 75`}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${radius - normalizedRadius + 11} 75 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius + normalizedRadius + 11} 75`}
            fill="none"
            stroke={model.gaugeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${arcLength - fillLength}`}
            className="transition-all duration-500"
          />
          <text
            x="75"
            y="70"
            textAnchor="middle"
            className="fill-white text-[16px] font-black"
          >
            {model.consistencyPct.toFixed(1)}%
          </text>
        </svg>
      </div>
      <p className="mb-3 text-center text-[10px] text-zinc-500">
        Highest profit day ÷ total profit
      </p>

      {model.consistencyOver50 && (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-950/40 px-2 py-2 text-center text-[11px] font-semibold text-[#FF8A8A]">
          Consistency Warning: Trade more days to balance profit
        </div>
      )}

      <div className="mb-3 rounded-md bg-[#0f0f0f] px-2 py-2 text-xs">
        {model.passedConsistency ? (
          <span className="font-semibold text-[#00F081]">50% rule: satisfied</span>
        ) : (
          <span className="font-semibold text-[#FF4D4D]">
            Need {formatMoney(model.remainingToConsistency)} more total profit vs. best day (50%
            cap).
          </span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Highest day profit</span>
          <span className="font-semibold text-white">{formatMoney(model.highestDayProfit)}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Total profit</span>
          <span className="font-semibold text-white">{formatMoney(model.totalProfit)}</span>
        </div>
        <div className="rounded-md bg-[#0f0f0f] px-2 py-2">
          <div className="mb-1 text-[11px]">
            <span
              className={cn(
                "font-medium",
                model.consistencyTargetMet ? "text-[#00F081]" : "text-[#FF4D4D]"
              )}
            >
              Consistency Target: {formatMoney(model.consistencyTarget)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#1A1A1A]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                model.consistencyTargetMet ? "bg-[#00F081]" : "bg-[#FF4D4D]"
              )}
              style={{ width: `${model.consistencyTargetProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={!model.withdrawalEnabled}
        className={cn(
          "mt-3 w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors",
          model.withdrawalEnabled
            ? "bg-[#00F081] text-[#052014] hover:bg-[#34f4a1]"
            : "cursor-not-allowed bg-[#1A1A1A] text-zinc-500"
        )}
      >
        Withdrawal
      </button>
      {!model.withdrawalEnabled && (
        <p className="mt-1 text-[11px] text-zinc-500">
          Requires 50% consistency and balance at or above {formatMoney(payoutTarget)}.
        </p>
      )}
    </div>
  )
}
