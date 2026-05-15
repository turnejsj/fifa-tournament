import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MatchRecord } from "@/lib/tournament-store"

export type DisputedMatchView = MatchRecord & {
  homeTeamName: string
  awayTeamName: string
}

type Props = {
  matches: DisputedMatchView[]
}

function claimScore(
  match: DisputedMatchView,
  player: 1 | 2
): { home: number; away: number; by: string } | null {
  if (player === 1) {
    const home = match.p1_home_score ?? match.home_score
    const away = match.p1_away_score ?? match.away_score
    const by = match.submitted_by_p1 ?? match.submitted_by
    if (home == null || away == null || !by) return null
    return { home, away, by }
  }
  const home = match.p2_home_score
  const away = match.p2_away_score
  const by = match.submitted_by_p2
  if (home == null || away == null || !by) return null
  return { home, away, by }
}

export function AdminDisputedMatches({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="pt-6 text-sm text-zinc-400">
          No disputed matches. When both players submit the same score, it is approved
          automatically.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <p className="text-sm text-zinc-400">
        Review conflicting submissions, enter the correct final score, and force-approve to update
        the league table.
      </p>
      {matches.map((match) => {
        const claim1 = claimScore(match, 1)
        const claim2 = claimScore(match, 2)

        return (
          <Card key={match.id} className="border-amber-500/30 bg-card/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                {match.homeTeamName} vs {match.awayTeamName}
              </CardTitle>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-400/90">
                Disputed
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {claim1 ? (
                  <div className="rounded-md border border-border bg-[#0a0a0a] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Player 1 claim
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {match.homeTeamName} {claim1.home} — {claim1.away} {match.awayTeamName}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{claim1.by}</p>
                  </div>
                ) : null}
                {claim2 ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Player 2 claim
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {match.homeTeamName} {claim2.home} — {claim2.away} {match.awayTeamName}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{claim2.by}</p>
                  </div>
                ) : null}
              </div>

              <form
                action={`/api/matches/${match.id}/decision`}
                method="post"
                className="space-y-4 rounded-md border border-border bg-[#0a0a0a] p-4"
              >
                <input type="hidden" name="decision" value="approved" />
                <p className="text-sm font-medium text-white">Final correct score</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`home-${match.id}`}>{match.homeTeamName} (home)</Label>
                    <Input
                      id={`home-${match.id}`}
                      name="homeScore"
                      type="number"
                      min={0}
                      required
                      className="border-input bg-[#090909]"
                      defaultValue={claim1?.home ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`away-${match.id}`}>{match.awayTeamName} (away)</Label>
                    <Input
                      id={`away-${match.id}`}
                      name="awayScore"
                      type="number"
                      min={0}
                      required
                      className="border-input bg-[#090909]"
                      defaultValue={claim1?.away ?? ""}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    className="bg-[#00F081] text-black hover:bg-[#00d874]"
                  >
                    Force approve
                  </Button>
                </div>
              </form>

              <form action={`/api/matches/${match.id}/decision`} method="post">
                <input type="hidden" name="decision" value="rejected" />
                <Button type="submit" variant="destructive">
                  Reject both claims
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      })}
    </>
  )
}
