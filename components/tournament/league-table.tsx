"use client"

import { useCallback, useState } from "react"
import html2canvas from "html2canvas"
import { toast } from "sonner"
import { LeagueRow } from "@/lib/tournament-store"
import { Button } from "@/components/ui/button"
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

/** Exact-name map for long `teams.name` values; mobile-only display via responsive spans. */
const TEAM_MOBILE_ABBREV: Record<string, string> = {
  "Manchester City": "Man City",
  "Atletico Madrid": "Atletico",
  "Bayern Munich": "Bayern",
  "Borussia Dortmund": "Dortmund",
  "Tottenham Hotspur": "Spurs",
  "West Ham United": "West Ham",
  "Brighton & Hove Albion": "Brighton",
  "Wolverhampton Wanderers": "Wolves",
  "Nottingham Forest": "Nottm Forest",
  "Crystal Palace": "Palace",
  "Newcastle United": "Newcastle",
  "Leicester City": "Leicester",
  "Sheffield United": "Sheff Utd",
  "Sheffield Wednesday": "Sheff Wed",
  "Queens Park Rangers": "QPR",
  "Paris Saint-Germain": "PSG",
}

function teamNameForMobile(team: string): string {
  const mapped = TEAM_MOBILE_ABBREV[team]
  if (mapped) return mapped
  if (team.length <= 13) return team
  return `${team.slice(0, 12)}…`
}

function ordinal(n: number): string {
  const j = n % 10
  const k = n % 100
  if (k >= 11 && k <= 13) return `${n}th`
  if (j === 1) return `${n}st`
  if (j === 2) return `${n}nd`
  if (j === 3) return `${n}rd`
  return `${n}th`
}

function buildStandingsWhatsAppMessage(rows: LeagueRow[], pageUrl: string): string {
  const standings =
    rows.length === 0
      ? "Current Standings: no teams on the board yet."
      : `Current Standings: ${rows.map((r, i) => `${ordinal(i + 1)} ${r.team} - ${r.points}pts`).join(", ")}`
  return `${standings} Check it out here: ${pageUrl}`
}

/** Solid backdrop for any letterboxing in the PNG (matches page card tone). */
const CAPTURE_BG = "#0b0b0b"

export function LeagueTable({ rows }: LeagueTableProps) {
  const [captureBusy, setCaptureBusy] = useState(false)

  const cellPad =
    "max-md:px-1 max-md:py-1 md:px-2 md:py-2 max-md:text-[10px] md:text-sm"
  const headPad =
    "max-md:h-8 max-md:px-1 max-md:py-1 md:h-10 md:px-2 max-md:text-[10px] md:text-sm"

  const shareTableImage = useCallback(async () => {
    const el = document.getElementById("league-table")
    if (!el || !(el instanceof HTMLElement)) {
      console.log("[league-table capture] missing element #league-table", el)
      toast.error("Could not capture the table.")
      return
    }
    setCaptureBusy(true)
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: CAPTURE_BG,
        logging: true,
        ignoreElements: (node) =>
          node instanceof HTMLElement && node.hasAttribute("data-html2canvas-ignore"),
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png")
      })
      if (!blob) {
        toast.error("Could not create the image.")
        return
      }

      const file = new File([blob], "Tournament_Standings.png", { type: "image/png" })

      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Tournament Standings",
            text: "FIFA Tournament standings",
          })
          toast.success("Share sheet opened — pick WhatsApp to send the image.")
          return
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            return
          }
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Tournament_Standings.png"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Saved Tournament_Standings.png — open it from Downloads or share to WhatsApp.")
    } catch (e) {
      console.log("[league-table capture] error:", e)
      if (e instanceof Error) {
        console.log("[league-table capture] error.message:", e.message, "stack:", e.stack)
      }
      toast.error("Could not capture the league table.")
    } finally {
      setCaptureBusy(false)
    }
  }, [])

  const openWhatsAppText = useCallback(() => {
    const url =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : ""
    const message = buildStandingsWhatsAppMessage(rows, url || "(open this site to copy the link)")
    const wa = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(wa, "_blank", "noopener,noreferrer")
  }, [rows])

  return (
    <div
      id="league-table"
      className="w-full min-w-0 rounded-xl border border-border bg-card/70 p-3 sm:p-4"
    >
      <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <h2 className="text-base font-semibold text-white sm:text-lg">Live League Table</h2>
        <p className="shrink-0 text-xs text-zinc-400">Approved matches only</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2" data-html2canvas-ignore>
        <Button
          type="button"
          size="sm"
          className="bg-[#25D366] text-white hover:bg-[#20bd5a]"
          disabled={captureBusy}
          onClick={() => void shareTableImage()}
        >
          {captureBusy ? "Capturing…" : "Share to WhatsApp"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={openWhatsAppText}>
          Share Text
        </Button>
      </div>

      <div className="w-full min-w-0 md:overflow-x-auto md:overscroll-x-contain md:[-webkit-overflow-scrolling:touch]">
        <Table className="w-full max-md:table-fixed max-md:text-[10px] md:min-w-[640px] md:text-sm">
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className={`${headPad} w-10 max-md:w-7 max-md:max-w-[1.75rem] shrink-0 text-left`}>
                  #
                </TableHead>
                <TableHead className={`${headPad} max-md:min-w-0`}>Team</TableHead>
                <TableHead
                  className={`${headPad} hidden min-w-[140px] text-zinc-400 md:table-cell`}
                >
                  Manager
                </TableHead>
                <TableHead className={`${headPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                  P
                </TableHead>
                <TableHead className={`${headPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                  W
                </TableHead>
                <TableHead className={`${headPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                  D
                </TableHead>
                <TableHead className={`${headPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                  L
                </TableHead>
                <TableHead className={`${headPad} max-md:w-7 max-md:max-w-[1.75rem] text-right`}>
                  GD
                </TableHead>
                <TableHead className={`${headPad} w-12 max-md:w-8 max-md:max-w-[2rem] shrink-0 text-right`}>
                  Pts
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.teamId} className="border-border">
                  <TableCell className={`${cellPad} w-10 max-md:w-7 max-md:max-w-[1.75rem] shrink-0`}>
                    {index + 1}
                  </TableCell>
                  <TableCell className={`${cellPad} max-md:min-w-0 font-medium max-md:truncate`}>
                    <span className="md:hidden">{teamNameForMobile(row.team)}</span>
                    <span className="hidden md:inline">{row.team}</span>
                  </TableCell>
                  <TableCell
                    className={`${cellPad} hidden max-w-[min(280px,40vw)] break-words text-sm text-zinc-300 md:table-cell`}
                  >
                    {row.manager}
                  </TableCell>
                  <TableCell className={`${cellPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                    {row.played}
                  </TableCell>
                  <TableCell className={`${cellPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                    {row.won}
                  </TableCell>
                  <TableCell className={`${cellPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                    {row.drawn}
                  </TableCell>
                  <TableCell className={`${cellPad} max-md:w-6 max-md:max-w-[1.5rem] text-right`}>
                    {row.lost}
                  </TableCell>
                  <TableCell className={`${cellPad} max-md:w-7 max-md:max-w-[1.75rem] text-right`}>
                    {row.goalDifference}
                  </TableCell>
                  <TableCell
                    className={`${cellPad} w-12 max-md:w-8 max-md:max-w-[2rem] shrink-0 text-right font-semibold text-[#00F081]`}
                  >
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
