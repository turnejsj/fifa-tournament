import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MatchRecord } from "@/lib/tournament-store"

export type PendingMatchView = MatchRecord & {
  screenshotUrl: string | null
  homeTeamName: string
  awayTeamName: string
}

type Props = {
  matches: PendingMatchView[]
}

export function AdminPendingMatches({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="pt-6 text-sm text-zinc-400">No pending matches.</CardContent>
      </Card>
    )
  }

  return (
    <>
      <p className="text-sm text-zinc-400">
        Approve a result to include it in the live league table. Reject if the score line is wrong.
      </p>
      {matches.map((match) => (
        <Card key={match.id} className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              {match.homeTeamName} {match.home_score} — {match.away_score} {match.awayTeamName}
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
                <Button className="bg-[#00F081] text-black hover:bg-[#00d874]">Approve</Button>
              </form>
              <form action={`/api/matches/${match.id}/decision`} method="post">
                <input type="hidden" name="decision" value="rejected" />
                <Button variant="destructive">Reject</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
