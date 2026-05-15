"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { PendingSignOffMatch } from "@/lib/pending-sign-off"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  matches: PendingSignOffMatch[]
}

export function PendingSignOffAlerts({ matches }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (matches.length === 0) return null

  async function handleAction(matchId: string, action: "approve" | "dispute") {
    setError(null)
    setBusyId(matchId)
    try {
      const body = new FormData()
      body.set("action", action)
      const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/sign-off`, {
        method: "POST",
        body,
      })
      const json = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Action failed")
        return
      }
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {matches.map((match) => {
        const loading = busyId === match.id
        return (
          <Card
            key={match.id}
            className="border-[#00F081]/30 bg-gradient-to-br from-[#0b0b0b] to-[#111112] shadow-md"
          >
            <CardHeader className="space-y-1 p-4 pb-2 sm:p-5 sm:pb-2">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#00F081]">
                Opponent submitted a result
              </p>
              <CardTitle className="text-base leading-snug text-white sm:text-lg">
                {match.homeTeamName} {match.p1HomeScore} — {match.p1AwayScore}{" "}
                {match.awayTeamName}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 sm:text-sm">
                Submitted {new Date(match.createdAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-0 sm:flex-row sm:p-5 sm:pt-0">
              <Button
                type="button"
                disabled={loading}
                className="w-full bg-[#00F081] text-black hover:bg-[#00d874] sm:flex-1"
                onClick={() => void handleAction(match.id, "approve")}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="size-4" />
                    Working…
                  </span>
                ) : (
                  "Approve"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="w-full border-amber-500/40 text-amber-200 hover:bg-amber-500/10 sm:flex-1"
                onClick={() => void handleAction(match.id, "dispute")}
              >
                Dispute
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
