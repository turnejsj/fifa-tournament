import Image from "next/image"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getMatches, getTeamMap, createServiceSupabaseClient } from "@/lib/tournament-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const BUCKET = "match-screenshots"

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect("/")

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  if (!adminIds.includes(userId)) {
    redirect("/")
  }

  const [teamMap, matches] = await Promise.all([getTeamMap(), getMatches("pending")])
  const supabase = createServiceSupabaseClient()

  const matchesWithUrls = await Promise.all(
    matches.map(async (match) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(match.screenshot_path)
      return {
        ...match,
        screenshotUrl: data.publicUrl,
      }
    })
  )

  return (
    <div className="min-h-screen bg-[#050505]">
      <TournamentNavbar isAdmin />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Admin Match Review</h1>
        <p className="text-sm text-zinc-400">
          Review each submission and approve only if the screenshot matches the score line.
        </p>

        {matchesWithUrls.length === 0 && (
          <Card className="border-border bg-card/80">
            <CardContent className="pt-6 text-sm text-zinc-400">
              No pending matches right now.
            </CardContent>
          </Card>
        )}

        {matchesWithUrls.map((match) => (
          <Card key={match.id} className="border-border bg-card/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                {teamMap[match.home_team_id] ?? "Unknown"} {match.home_score} -{" "}
                {match.away_score} {teamMap[match.away_team_id] ?? "Unknown"}
              </CardTitle>
              <p className="text-xs text-zinc-400">
                Submitted by {match.submitted_by} on{" "}
                {new Date(match.created_at).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Image
                src={match.screenshotUrl}
                alt="Uploaded match proof"
                width={1200}
                height={800}
                unoptimized
                className="max-h-[420px] w-full rounded-md border border-border object-contain"
              />
              <div className="flex gap-2">
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
