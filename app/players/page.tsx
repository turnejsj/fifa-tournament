import { PlayerDirectoryClient } from "@/components/tournament/player-directory-client"
import { PlayerTournamentDetailsForm } from "@/components/tournament/player-tournament-details-form"
import { TournamentNavbar } from "@/components/tournament/navbar"

export default function PlayersPage() {
  return (
    <div className="min-h-screen min-w-0 bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto w-full min-w-0 max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <PlayerTournamentDetailsForm />
        <div className="mb-6 sm:mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#00F081] sm:text-sm">Roster</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-white sm:text-3xl">
            Player Directory
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Find teammates by name, tournament side, platform, and gamer tag. Use Copy to add
            friends fast.
          </p>
        </div>

        <PlayerDirectoryClient />
      </main>
    </div>
  )
}
