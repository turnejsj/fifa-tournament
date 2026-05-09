import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { TournamentNavbar } from "@/components/tournament/navbar"
import { getTeams } from "@/lib/tournament-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type SubmitScorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SubmitScorePage({ searchParams }: SubmitScorePageProps) {
  const { userId } = await auth()
  if (!userId) redirect("/")
  const params = await searchParams

  const teams = await getTeams()

  return (
    <div className="min-h-screen bg-[#050505]">
      <TournamentNavbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="text-white">Submit Match Score</CardTitle>
            <p className="text-sm text-zinc-400">
              Enter the result. It stays pending until an admin approves it; then it appears on
              the league table.
            </p>
            {params.submitted === "1" && (
              <p className="rounded-md border border-[#00F081]/30 bg-[#00F081]/10 px-3 py-2 text-sm text-[#00F081]">
                Match submitted. Awaiting admin approval.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form action="/api/matches/submit" method="post" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="homeTeam">Home Team</Label>
                  <select
                    id="homeTeam"
                    name="homeTeam"
                    className="h-10 w-full rounded-md border border-input bg-[#090909] px-3 text-sm"
                    required
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayTeam">Away Team</Label>
                  <select
                    id="awayTeam"
                    name="awayTeam"
                    className="h-10 w-full rounded-md border border-input bg-[#090909] px-3 text-sm"
                    required
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homeScore">Home Score</Label>
                  <Input id="homeScore" type="number" min={0} name="homeScore" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayScore">Away Score</Label>
                  <Input id="awayScore" type="number" min={0} name="awayScore" required />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#00F081] text-black hover:bg-[#00d874]">
                Submit result
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
