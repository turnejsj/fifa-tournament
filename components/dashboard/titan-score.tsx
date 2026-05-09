"use client"

import { Trade, calculateTitanScore } from "@/lib/trades"
import { cn } from "@/lib/utils"

interface TitanScoreProps {
  trades: Trade[]
  dailyLossLimit?: number
}

export function TitanScore({ trades, dailyLossLimit = 2000 }: TitanScoreProps) {
  const {
    score,
    profitFactor,
    winRate,
    profitabilityPoints,
    disciplinePoints,
    consistencyPoints,
  } = calculateTitanScore(trades, dailyLossLimit)

  const radius = 62
  const stroke = 12
  const normalizedRadius = radius - stroke * 0.5
  const circumference = normalizedRadius * 2 * Math.PI
  const progress = Math.max(0, Math.min(100, score))
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const fmtProfitFactor =
    Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "INF"

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Titan Score
      </div>

      <div className="mb-4 flex items-center justify-center">
        <div className="relative h-40 w-40">
          <svg
            className="h-40 w-40 -rotate-90"
            viewBox={`0 0 ${radius * 2} ${radius * 2}`}
          >
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="transparent"
              className="stroke-muted"
              strokeWidth={stroke}
            />
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="transparent"
              stroke="#00E5FF"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-white">{score}</span>
            <span className="text-xs uppercase tracking-wider text-zinc-400">
              / 100
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Profitability (&gt; 1.5 PF)</span>
          <span className="font-semibold text-white">{profitabilityPoints}/40</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Discipline (daily loss limit)</span>
          <span className="font-semibold text-white">{disciplinePoints}/30</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-[#0f0f0f] px-2 py-1.5">
          <span className="text-zinc-400">Consistency (&gt; 50% win rate)</span>
          <span className="font-semibold text-white">{consistencyPoints}/30</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-[#1A1A1A] px-2 py-1.5">
          <div className="text-zinc-400">Profit Factor</div>
          <div className="font-semibold text-white">{fmtProfitFactor}</div>
        </div>
        <div className="rounded-md border border-[#1A1A1A] px-2 py-1.5">
          <div className="text-zinc-400">Win Rate</div>
          <div className="font-semibold text-white">{winRate.toFixed(1)}%</div>
        </div>
      </div>

      <p
        className={cn(
          "mt-2 text-[11px]",
          score >= 70 ? "text-[#00F081]" : "text-zinc-400"
        )}
      >
        Daily loss limit used: ${dailyLossLimit.toLocaleString("en-US")}
      </p>
    </div>
  )
}
