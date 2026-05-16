"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type TeamOption = { id: string; name: string }

const SELECT_CLASS =
  "h-12 w-full rounded-md border border-input bg-[#090909] px-3 text-sm text-zinc-100"

const COUNTER_BTN =
  "flex size-14 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-2xl font-semibold text-white transition-colors active:bg-zinc-800 disabled:pointer-events-none disabled:opacity-40"

function normalizeTeamKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function teamNamesMatch(a: string, b: string): boolean {
  const x = normalizeTeamKey(a)
  const y = normalizeTeamKey(b)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

function ScoreCounter({
  label,
  value,
  onChange,
  max = 99,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  max?: number
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="line-clamp-2 min-h-[2.5rem] px-1 text-center text-xs font-medium text-zinc-400">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={COUNTER_BTN}
          aria-label={`Decrease ${label} score`}
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus className="size-6" />
        </button>
        <span
          className="min-w-[3.5rem] text-center text-5xl font-bold tabular-nums tracking-tight text-white"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          className={COUNTER_BTN}
          aria-label={`Increase ${label} score`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  )
}

export function SubmitScoreForm({
  teams,
  playerTeamName,
}: {
  teams: TeamOption[]
  playerTeamName: string | null
}) {
  const router = useRouter()
  const [opponentTeamId, setOpponentTeamId] = useState("")
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)

  const playerTeam = useMemo(() => {
    if (!playerTeamName?.trim()) return null
    return teams.find((t) => teamNamesMatch(t.name, playerTeamName)) ?? null
  }, [teams, playerTeamName])

  const opponentOptions = useMemo(
    () => teams.filter((t) => t.id !== playerTeam?.id),
    [teams, playerTeam],
  )

  const opponentTeam = teams.find((t) => t.id === opponentTeamId) ?? null
  const canSubmit = Boolean(playerTeam && opponentTeamId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerTeam || !opponentTeamId) return

    try {
      const res = await fetch("/api/matches/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeam: playerTeam.id,
          awayTeam: opponentTeamId,
          homeScore,
          awayScore,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean }

      if (!res.ok) {
        toast.error(data.error ?? "Could not submit result.")
        return
      }

      router.push("/submit-score?submitted=1")
      router.refresh()
    } catch {
      toast.error("Could not submit result. Check your connection and try again.")
    }
  }

  if (!playerTeam) {
    return (
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
        Set your tournament team on the home page before submitting a score.
      </p>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-zinc-400">Your team</Label>
          <div className="flex h-12 items-center rounded-md border border-[#00F081]/30 bg-[#00F081]/10 px-3 text-sm font-medium text-white">
            {playerTeam.name}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opponentTeam">Opponent</Label>
          <select
            id="opponentTeam"
            className={SELECT_CLASS}
            value={opponentTeamId}
            onChange={(e) => setOpponentTeamId(e.target.value)}
          >
            <option value="">Select opponent</option>
            {opponentOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-[#090909]/80 p-4">
        <ScoreCounter label={playerTeam.name} value={homeScore} onChange={setHomeScore} />
        <ScoreCounter
          label={opponentTeam?.name ?? "Opponent"}
          value={awayScore}
          onChange={setAwayScore}
        />
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-12 w-full bg-[#00F081] text-base font-semibold text-black hover:bg-[#00d874] disabled:opacity-40"
      >
        Submit Result
      </Button>
    </form>
  )
}
