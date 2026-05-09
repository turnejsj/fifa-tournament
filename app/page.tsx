import { LeagueTable } from "@/components/tournament/league-table"
import { PlayerTournamentDetailsForm } from "@/components/tournament/player-tournament-details-form"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getLeagueTable } from "@/lib/tournament-store"

/** Always read the latest `teams` names and standings from Supabase (no static stale snapshot). */
export const dynamic = "force-dynamic"

function formatLoadError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message: unknown }).message
    if (typeof m === "string" && m.length > 0) return m
  }
  return "Could not load league table from Supabase."
}

export default async function LandingPage() {
  let table: Awaited<ReturnType<typeof getLeagueTable>> = []
  let tableError: string | null = null
  try {
    table = await getLeagueTable()
  } catch (e) {
    tableError = formatLoadError(e)
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-3 py-6 sm:gap-8 sm:px-4 sm:py-8">
        {tableError && (
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
            role="alert"
          >
            <p className="font-medium">League table unavailable</p>
            <p className="mt-1 text-muted-foreground">{tableError}</p>
          </div>
        )}
        <PlayerTournamentDetailsForm />
        <section className="rounded-xl border border-border bg-gradient-to-br from-[#0b0b0b] to-[#111112] p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#00F081] sm:text-sm">
            Official Competition Center
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
            FIFA Tournament
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Submissions wait for admin approval; the live table only includes approved results.
          </p>
        </section>

        <LeagueTable rows={table} />
      </main>
    </div>
  )
}
