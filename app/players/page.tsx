import { PlayerTournamentDetailsForm } from "@/components/tournament/player-tournament-details-form"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { CopyGamerTagButton } from "@/components/tournament/copy-gamer-tag-button"
import { PlatformBadge } from "@/components/tournament/platform-badge"
import { getAllPlayerProfiles } from "@/lib/player-profiles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function dash(s: string | null | undefined) {
  const t = s?.trim()
  return t ? t : "—"
}

export default async function PlayersPage() {
  let players: Awaited<ReturnType<typeof getAllPlayerProfiles>> = []
  let errorMessage: string | null = null
  try {
    players = await getAllPlayerProfiles()
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Could not load players."
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <PlayerTournamentDetailsForm />
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-[#00F081]">Roster</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Player Directory</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Find teammates by tournament side, platform, and gamer tag. Use Copy to add
            friends fast.
          </p>
        </div>

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
            {/* Mobile: stacked cards */}
            <div className="grid gap-3 p-4 md:hidden">
              {players.length === 0 && !errorMessage && (
                <p className="text-sm text-zinc-500">No profiles yet. Add rows in Supabase.</p>
              )}
              {players.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-border bg-[#0a0a0a] p-4 shadow-sm"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Tournament team
                  </div>
                  <div className="mt-1 font-semibold text-white">{dash(p.tournament_team)}</div>
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

            {/* md+: table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-zinc-400">Tournament team</TableHead>
                    <TableHead className="text-zinc-400">Platform</TableHead>
                    <TableHead className="min-w-[200px] text-zinc-400">Gamer tag</TableHead>
                    <TableHead className="w-[100px] text-right text-zinc-400" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.length === 0 && !errorMessage && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-zinc-500">
                        No profiles yet. Add rows in Supabase.
                      </TableCell>
                    </TableRow>
                  )}
                  {players.map((p) => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="font-medium text-white">
                        {dash(p.tournament_team)}
                      </TableCell>
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
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
