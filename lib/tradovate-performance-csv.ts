import Papa from "papaparse"
import type { PerformanceDailyRow } from "@/lib/performance-daily-store"
import { stripAccountingPnlToNumber } from "@/lib/pnl-parse"
import { parseUsSlashDateTime, toCalendarDayKey } from "@/lib/trade-timestamps"

type Row = Record<string, string | number | null | undefined>

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

/** Header key: lowercase, collapse spaces, strip BOM. */
export function normalizePerformanceHeaderKey(k: string): string {
  return norm(String(k).replace(/^\ufeff/, ""))
}

/**
 * Parse `pnl` cells: strip `$` `,` `(` `)` and spaces, then number (e.g. `$(100.00)` → `-100`).
 */
export function parsePerformancePnl(raw: string): number | null {
  return stripAccountingPnlToNumber(String(raw ?? ""))
}

/** Calendar day YYYY-MM-DD from timestamp / date cell (`MM/DD/YYYY HH:mm:ss` and ISO). */
function toDayKey(value: string): string | null {
  const s = String(value ?? "").trim()
  if (!s) return null

  const us = parseUsSlashDateTime(s)
  if (us) return toCalendarDayKey(us)

  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return toCalendarDayKey(d)

  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdy) {
    const mo = String(Number(mdy[1])).padStart(2, "0")
    const da = String(Number(mdy[2])).padStart(2, "0")
    let y = Number(mdy[3])
    if (y < 100) y += 2000
    return `${y}-${mo}-${da}`
  }
  return null
}

function rowNormMap(row: Row): Map<string, string> {
  const m = new Map<string, string>()
  for (const [k, v] of Object.entries(row)) {
    m.set(normalizePerformanceHeaderKey(k), String(v ?? ""))
  }
  return m
}

/** First non-empty cell matching any normalized header alias. */
function pickCell(m: Map<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const key = normalizePerformanceHeaderKey(a)
    const v = m.get(key)
    if (v != null && String(v).trim() !== "") return String(v)
  }
  return ""
}

/**
 * Parse Performance CSV safely: never throws. Returns [] on empty / malformed input.
 * Uses **`boughtTimestamp`** (and aliases) for the calendar date and **`pnl`** for Net P/L.
 * Multiple rows per day are summed per account + day for consistency / withdrawal cards.
 */
export function parsePerformanceDailyCsv(csvText: string, defaultAccount = "Apex"): PerformanceDailyRow[] {
  try {
    const trimmed = String(csvText ?? "").trim()
    if (!trimmed) return []

    const results = Papa.parse<Row>(trimmed, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => normalizePerformanceHeaderKey(h),
    })

    if (results.errors?.length) {
      console.warn("[parsePerformanceDailyCsv] PapaParse:", results.errors[0]?.message)
    }

    const rows = (results.data ?? []).filter((r) => r && Object.keys(r).length > 0)
    if (rows.length === 0) return []

    const dateAliases = [
      "boughttimestamp",
      "bought timestamp",
      "soldtimestamp",
      "sold timestamp",
      "closetimestamp",
      "close timestamp",
      "tradetimestamp",
      "trade timestamp",
      "timestamp",
      "trade date",
      "session date",
      "date",
    ]
    const pnlAliases = ["pnl", "net p/l", "net p l", "net pl", "net", "daily net", "p/l"]
    /** Tradovate Account / login id (same value as the Account column on Orders CSV, e.g. PAAPEX…). */
    const accountAliases = ["account", "acct", "login"]

    const byKey = new Map<string, PerformanceDailyRow>()

    for (const row of rows) {
      const m = rowNormMap(row)
      const rawTs = pickCell(m, dateAliases)
      const rawPnl = pickCell(m, pnlAliases)
      const day = toDayKey(rawTs)
      const net = parsePerformancePnl(rawPnl)
      if (!day || net === null) continue

      const rawAcct = pickCell(m, accountAliases)
      const account = rawAcct.trim() || defaultAccount
      const mapKey = `${account}\t${day}`
      const prev = byKey.get(mapKey)
      if (prev) prev.net_total += net
      else byKey.set(mapKey, { account, day, net_total: net })
    }

    return [...byKey.values()].sort((a, b) => a.day.localeCompare(b.day))
  } catch (e) {
    console.warn("[parsePerformanceDailyCsv]", e)
    return []
  }
}
