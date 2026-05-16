import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { SubmitScoreForm } from "@/components/tournament/submit-score-form"
import { createServiceSupabaseClient, getTeams } from "@/lib/tournament-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** Dropdown options must match the current `teams` table in Supabase. */
export const dynamic = "force-dynamic"

type SubmitScorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SubmitScorePage({ searchParams }: SubmitScorePageProps) {
  const { userId } = await auth()
  if (!userId) redirect("/")
  const params = await searchParams

  const teams = await getTeams()

  let playerTeamName: string | null = null
  try {
    const supabase = createServiceSupabaseClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("tournament_team")
      .eq("id", userId)
      .maybeSingle()
    playerTeamName =
      typeof profile?.tournament_team === "string" ? profile.tournament_team.trim() : null
  } catch {
    playerTeamName = null
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto w-full min-w-0 max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
        <Card className="border-border bg-card/80">
          <CardHeader className="space-y-2 p-4 sm:p-6">
            <CardTitle className="text-lg text-white sm:text-xl">Submit Match Score</CardTitle>
            <p className="text-sm text-zinc-400">
              Enter the result for your match. Your opponent will see it on their dashboard and can
              approve or dispute it. Use Scan TV Screen to fill scores from the broadcast.
            </p>
            {params.submitted === "1" && (
              <p className="rounded-md border border-[#00F081]/30 bg-[#00F081]/10 px-3 py-2 text-sm text-[#00F081]">
                Score submitted. Waiting for your opponent to approve on their dashboard.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <SubmitScoreForm
              teams={teams.map((t) => ({ id: t.id, name: t.name }))}
              playerTeamName={playerTeamName}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
