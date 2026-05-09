import { auth } from "@clerk/nextjs/server"
import { LeagueTable } from "@/components/tournament/league-table"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getLeagueTable } from "@/lib/tournament-store"

export default async function LandingPage() {
  const { userId } = await auth()
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  const isAdmin = Boolean(userId && adminIds.includes(userId))
  const table = await getLeagueTable()

  return (
    <div className="min-h-screen bg-[#050505]">
      <TournamentNavbar isAdmin={isAdmin} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="rounded-xl border border-border bg-gradient-to-br from-[#0b0b0b] to-[#111112] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#00F081]">
            Official Competition Center
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">FIFA Tournament</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Track standings in real-time as approved results come in. Players can submit
            match scores with proof screenshots, and admins can verify every result.
          </p>
        </section>

        <LeagueTable rows={table} />
      </main>
    </div>
  )
}
