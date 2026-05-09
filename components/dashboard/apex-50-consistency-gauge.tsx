"use client"

import { useMemo } from "react"
import { DbTradeRow } from "@/lib/trade-store"
import type { PerformanceDailyRow } from "@/lib/performance-daily-store"
import { computeApex50Consistency } from "@/lib/apex-consistency-metrics"

const formatMoney = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

interface Apex50ConsistencyGaugeProps {
  trades: DbTradeRow[]
  inactiveMessage?: string
  performanceDaily?: PerformanceDailyRow[] | null
  performanceAccount?: string | null
}

export function Apex50ConsistencyGauge({
  trades,
  inactiveMessage,
  performanceDaily,
  performanceAccount,
}: Apex50ConsistencyGaugeProps) {
  const model = useMemo(() => {
    if (inactiveMessage) return null
    return computeApex50Consistency(trades, {
      performanceDaily,
      performanceAccount: performanceAccount ?? null,
    })
  }, [trades, inactiveMessage, performanceDaily, performanceAccount])

  if (!model) {
    return (
      <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          50% consistency
        </div>
        <p className="text-[11px] text-zinc-500">
          {inactiveMessage ?? "Select a single account to measure payout readiness."}
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
        50% consistency
      </div>
      <p className="mb-3 text-[10px] uppercase tracking-wide text-zinc-600">Payout readiness</p>

      <div className="flex justify-center">
        <svg width="150" height="86" viewBox="0 0 150 86" aria-label="Consistency percentage gauge">
          <title>50% rule: {model.consistencyPct.toFixed(1)}%</title>
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
          <span className="text-zinc-400">Highest day</span>
          <span className="font-semibold text-white">{formatMoney(model.highestDayProfit)}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Total profit</span>
          <span className="font-semibold text-white">{formatMoney(model.totalProfit)}</span>
        </div>
      </div>
    </div>
  )
}
