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
    <div className="w-full min-w-0 rounded-xl border border-border bg-card/70 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <h2 className="text-base font-semibold text-white sm:text-lg">Live League Table</h2>
        <p className="shrink-0 text-xs text-zinc-400">Approved matches only</p>
      </div>

      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="w-10">#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="min-w-[140px] text-zinc-400">Manager</TableHead>
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
              <TableCell className="max-w-[min(280px,40vw)] text-sm break-words text-zinc-300">
                {row.manager}
              </TableCell>
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
    </div>
  )
}
