import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { AdminPanel } from "@/components/tournament/admin-panel"
import {
  AdminPendingMatches,
  type PendingMatchView,
} from "@/components/tournament/admin-pending-matches"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getProfilesForAdmin } from "@/lib/admin-profiles"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import {
  createServiceSupabaseClient,
  getMatches,
  getTeamMap,
  getTeams,
} from "@/lib/tournament-store"

const BUCKET = "match-screenshots"

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect("/")

  if (!(await isClerkUserAdmin(userId))) {
    redirect("/")
  }

  const [teamMap, matches, profiles, teams] = await Promise.all([
    getTeamMap(),
    getMatches("pending"),
    getProfilesForAdmin(),
    getTeams(),
  ])

  const supabase = createServiceSupabaseClient()

  const matchesWithUrls: PendingMatchView[] = await Promise.all(
    matches.map(async (match) => {
      const path = match.screenshot_path?.trim() ?? ""
      let screenshotUrl: string | null = null
      if (path) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        screenshotUrl = data.publicUrl
      }
      return {
        ...match,
        screenshotUrl,
        homeTeamName: teamMap[match.home_team_id] ?? "Unknown",
        awayTeamName: teamMap[match.away_team_id] ?? "Unknown",
      }
    })
  )

  return (
    <div className="min-h-screen min-w-0 bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 px-3 py-6 sm:px-4 sm:py-8">
        <div>
          <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Review submissions, manage access, teams, and league data.
          </p>
        </div>

        <AdminPanel
          currentUserId={userId}
          profiles={profiles}
          teams={teams}
          pendingMatches={<AdminPendingMatches matches={matchesWithUrls} />}
        />
      </main>
    </div>
  )
}
