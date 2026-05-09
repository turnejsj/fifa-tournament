"use client"

import { useEffect, useState } from "react"
import type { PlayerProfileRow } from "@/lib/player-profiles"
import { CopyGamerTagButton } from "@/components/tournament/copy-gamer-tag-button"
import { PlatformBadge } from "@/components/tournament/platform-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"

function dash(s: string | null | undefined) {
  const t = s?.trim()
  return t ? t : "—"
}

function playerDisplayName(fullName: string | null | undefined): string {
  return fullName?.trim() ? fullName.trim() : "Anonymous Player"
}

export function PlayerDirectoryClient() {
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<PlayerProfileRow[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setErrorMessage(null)
      try {
        const res = await fetch("/api/players/directory")
        let json: { players?: PlayerProfileRow[]; error?: string }
        try {
          json = (await res.json()) as { players?: PlayerProfileRow[]; error?: string }
        } catch (parseErr) {
          console.error(parseErr)
          if (!cancelled) {
            setErrorMessage("Invalid response from server")
            setPlayers([])
          }
          return
        }

        if (!res.ok) {
          const err = new Error(json.error ?? res.statusText)
          console.error(err)
          if (!cancelled) {
            setErrorMessage(json.error ?? res.statusText)
            setPlayers([])
          }
          return
        }

        if (!cancelled) {
          setPlayers(Array.isArray(json.players) ? json.players : [])
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load players.")
          setPlayers([])
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
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-[#0a0a0a] p-4 shadow-sm"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Player name
                    </div>
                    <div className="mt-1 font-semibold text-white">{playerDisplayName(p.full_name)}</div>
                    <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Tournament team
                    </div>
                    <div className="mt-1 text-white">{dash(p.tournament_team)}</div>
                    <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Platform
                    </div>
                    <div className="mt-1">
                      <PlatformBadge platform={p.platform} />
                    </div>
                    <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Gamer tag
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-zinc-100">{dash(p.gamer_tag)}</span>
                      {p.gamer_tag?.trim() ? (
                        <CopyGamerTagButton gamerTag={p.gamer_tag.trim()} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-zinc-400">Player name</TableHead>
                      <TableHead className="text-zinc-400">Tournament team</TableHead>
                      <TableHead className="text-zinc-400">Platform</TableHead>
                      <TableHead className="min-w-[180px] text-zinc-400">Gamer tag</TableHead>
                      <TableHead className="w-[100px] text-right text-zinc-400" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((p) => (
                      <TableRow key={p.id} className="border-border">
                        <TableCell className="font-medium text-white">
                          {playerDisplayName(p.full_name)}
                        </TableCell>
                        <TableCell className="text-zinc-200">{dash(p.tournament_team)}</TableCell>
                        <TableCell>
                          <PlatformBadge platform={p.platform} />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-zinc-100">
                            {dash(p.gamer_tag)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.gamer_tag?.trim() ? (
                            <CopyGamerTagButton gamerTag={p.gamer_tag.trim()} />
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
