import { LeagueTable } from "@/components/tournament/league-table"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getLeagueTable } from "@/lib/tournament-store"

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
    <div className="min-h-screen bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
        {tableError && (
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
            role="alert"
          >
            <p className="font-medium">League table unavailable</p>
            <p className="mt-1 text-muted-foreground">{tableError}</p>
          </div>
        )}
        <section className="rounded-xl border border-border bg-gradient-to-br from-[#0b0b0b] to-[#111112] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#00F081]">
            Official Competition Center
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">FIFA Tournament</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Track standings in real time. Logged-in players submit match results and scores
            count toward the table immediately.
          </p>
        </section>

        <LeagueTable rows={table} />
      </main>
    </div>
  )
}
