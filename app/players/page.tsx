import { PlayerDirectoryClient } from "@/components/tournament/player-directory-client"
import { PlayerTournamentDetailsForm } from "@/components/tournament/player-tournament-details-form"
import { TournamentNavbar } from "@/components/tournament/navbar"

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <PlayerTournamentDetailsForm />
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-[#00F081]">Roster</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Player Directory</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Find teammates by email, tournament side, platform, and gamer tag. Use Copy to add
            friends fast.
          </p>
        </div>

        <PlayerDirectoryClient />
      </main>
    </div>
  )
}
