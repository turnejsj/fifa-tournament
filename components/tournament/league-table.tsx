import { LeagueRow } from "@/lib/tournament-store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type LeagueTableProps = {
  rows: LeagueRow[]
}

export function LeagueTable({ rows }: LeagueTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Live League Table</h2>
        <p className="text-xs text-zinc-400">Submitted results</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="w-10">#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">P</TableHead>
            <TableHead className="text-right">W</TableHead>
            <TableHead className="text-right">D</TableHead>
            <TableHead className="text-right">L</TableHead>
            <TableHead className="text-right">GD</TableHead>
            <TableHead className="text-right">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.teamId} className="border-border">
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{row.team}</TableCell>
              <TableCell className="text-right">{row.played}</TableCell>
              <TableCell className="text-right">{row.won}</TableCell>
              <TableCell className="text-right">{row.drawn}</TableCell>
              <TableCell className="text-right">{row.lost}</TableCell>
              <TableCell className="text-right">{row.goalDifference}</TableCell>
              <TableCell className="text-right font-semibold text-[#00F081]">
                {row.points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
