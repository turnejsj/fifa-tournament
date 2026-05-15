import { auth } from "@clerk/nextjs/server"
import { LeagueTable } from "@/components/tournament/league-table"
import { PendingSignOffAlerts } from "@/components/tournament/pending-sign-off-alerts"
import { PlayerTournamentDetailsForm } from "@/components/tournament/player-tournament-details-form"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getPendingSignOffForUser } from "@/lib/pending-sign-off"
import { createServiceSupabaseClient, getLeagueTable } from "@/lib/tournament-store"

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

type LandingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const params = await searchParams
  const { userId } = await auth()

  let table: Awaited<ReturnType<typeof getLeagueTable>> = []
  let tableError: string | null = null
  let signOffMatches: Awaited<ReturnType<typeof getPendingSignOffForUser>> = []

  try {
    table = await getLeagueTable()
  } catch (e) {
    tableError = formatLoadError(e)
  }

  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const { data: profile } = await supabase
        .from("profiles")
        .select("tournament_team")
        .eq("id", userId)
        .maybeSingle()
      const userTeam =
        typeof profile?.tournament_team === "string" ? profile.tournament_team : null
      signOffMatches = await getPendingSignOffForUser(userId, userTeam)
    } catch {
      signOffMatches = []
    }
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

        {params.signed === "approved" && (
          <p className="rounded-md border border-[#00F081]/30 bg-[#00F081]/10 px-3 py-2 text-sm text-[#00F081]">
            Result approved. The league table has been updated.
          </p>
        )}
        {params.signed === "disputed" && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            You disputed this result. An admin will decide the final score.
          </p>
        )}

        <PendingSignOffAlerts matches={signOffMatches} />

        <PlayerTournamentDetailsForm />
        <section className="rounded-xl border border-border bg-gradient-to-br from-[#0b0b0b] to-[#111112] p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#00F081] sm:text-sm">
            Official Competition Center
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
            FIFA Tournament
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Submit a score, then your opponent approves it on their dashboard. Disputed results are
            settled by an admin.
          </p>
        </section>

        <LeagueTable rows={table} />
      </main>
    </div>
  )
}
