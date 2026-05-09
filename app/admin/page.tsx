import Image from "next/image"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getMatches, getTeamMap, createServiceSupabaseClient } from "@/lib/tournament-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const BUCKET = "match-screenshots"

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect("/")

  if (!(await isClerkUserAdmin(userId))) {
    redirect("/")
  }

  const [teamMap, matches] = await Promise.all([getTeamMap(), getMatches("pending")])
  const supabase = createServiceSupabaseClient()

  const matchesWithUrls = await Promise.all(
    matches.map(async (match) => {
      const path = match.screenshot_path?.trim() ?? ""
      if (!path) {
        return { ...match, screenshotUrl: null as string | null }
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return {
        ...match,
        screenshotUrl: data.publicUrl,
      }
    })
  )

  return (
    <div className="min-h-screen min-w-0 bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 px-3 py-6 sm:px-4 sm:py-8">
        <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
          Admin — pending matches
        </h1>
        <p className="text-sm text-zinc-400">
          Approve a result to include it in the live league table. Reject if the score line is
          wrong.
        </p>

        {matchesWithUrls.length === 0 && (
          <Card className="border-border bg-card/80">
            <CardContent className="pt-6 text-sm text-zinc-400">
              No pending matches.
            </CardContent>
          </Card>
        )}

        {matchesWithUrls.map((match) => (
          <Card key={match.id} className="border-border bg-card/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                {teamMap[match.home_team_id] ?? "Unknown"} {match.home_score} —{" "}
                {match.away_score} {teamMap[match.away_team_id] ?? "Unknown"}
              </CardTitle>
              <p className="text-xs text-zinc-400">
                Submitted by {match.submitted_by} on{" "}
                {new Date(match.created_at).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {match.screenshotUrl ? (
                <Image
                  src={match.screenshotUrl}
                  alt="Match proof"
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-h-[420px] w-full rounded-md border border-border object-contain"
                />
              ) : (
                <p className="rounded-md border border-border bg-muted/30 px-3 py-8 text-center text-sm text-zinc-500">
                  No screenshot attached
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <form action={`/api/matches/${match.id}/decision`} method="post">
                  <input type="hidden" name="decision" value="approved" />
                  <Button className="bg-[#00F081] text-black hover:bg-[#00d874]">
                    Approve
                  </Button>
                </form>
                <form action={`/api/matches/${match.id}/decision`} method="post">
                  <input type="hidden" name="decision" value="rejected" />
                  <Button variant="destructive">Reject</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
