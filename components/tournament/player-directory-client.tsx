"use client"

import { useEffect, useState } from "react"
import type { PlayerProfileRow } from "@/lib/player-profiles"
import { CopyGamerTagButton } from "@/components/tournament/copy-gamer-tag-button"
import { PlayerNameAdminEditor } from "@/components/tournament/player-name-admin-editor"
import { PlatformBadge } from "@/components/tournament/platform-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

function dash(s: string | null | undefined) {
  const t = s?.trim()
  return t ? t : "—"
}

function playerDisplayName(fullName: string | null | undefined): string {
  return fullName?.trim() ? fullName.trim() : "Anonymous Player"
}

function PlayerProfileCard({
  player: p,
  isAdmin,
  onNameSaved,
}: {
  player: PlayerProfileRow
  isAdmin: boolean
  onNameSaved: (profileId: string, fullName: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-border bg-[#0a0a0a] p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Player name</div>
      <div className="mt-1 min-w-0 font-semibold text-white">
        {isAdmin ? (
          <PlayerNameAdminEditor
            profileId={p.id}
            initialName={p.full_name}
            onSaved={(name) => onNameSaved(p.id, name)}
          />
        ) : (
          playerDisplayName(p.full_name)
        )}
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Tournament team
      </div>
      <div className="mt-1 text-white">{dash(p.tournament_team)}</div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Platform</div>
      <div className="mt-1">
        <PlatformBadge platform={p.platform} />
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Gamer tag</div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 break-all font-mono text-sm text-zinc-100">{dash(p.gamer_tag)}</span>
        {p.gamer_tag?.trim() ? <CopyGamerTagButton gamerTag={p.gamer_tag.trim()} /> : null}
      </div>
    </div>
  )
}

export function PlayerDirectoryClient() {
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<PlayerProfileRow[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setErrorMessage(null)
      try {
        const res = await fetch("/api/players/directory")
        let json: { players?: PlayerProfileRow[]; isAdmin?: boolean; error?: string }
        try {
          json = (await res.json()) as {
            players?: PlayerProfileRow[]
            isAdmin?: boolean
            error?: string
          }
        } catch (parseErr) {
          console.error(parseErr)
          if (!cancelled) {
            setErrorMessage("Invalid response from server")
            setPlayers([])
            setIsAdmin(false)
          }
          return
        }

        if (!res.ok) {
          const err = new Error(json.error ?? res.statusText)
          console.error(err)
          if (!cancelled) {
            setErrorMessage(json.error ?? res.statusText)
            setPlayers([])
            setIsAdmin(false)
          }
          return
        }

        if (!cancelled) {
          setPlayers(Array.isArray(json.players) ? json.players : [])
          setIsAdmin(Boolean(json.isAdmin))
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load players.")
          setPlayers([])
          setIsAdmin(false)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="flex items-center gap-3 py-12">
          <Spinner className="size-5 text-[#00F081]" />
          <span className="text-sm text-zinc-400">Loading player directory…</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {errorMessage && (
        <div
          className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-white">Registered players</CardTitle>
          <CardDescription className="text-zinc-400">
            {players.length} {players.length === 1 ? "profile" : "profiles"} in Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!errorMessage && players.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-zinc-400">No players found</p>
          ) : null}

          {players.length > 0 && (
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
              {players.map((p) => (
                <PlayerProfileCard
                  key={p.id}
                  player={p}
                  isAdmin={isAdmin}
                  onNameSaved={(id, name) =>
                    setPlayers((prev) =>
                      prev.map((row) => (row.id === id ? { ...row, full_name: name } : row))
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
