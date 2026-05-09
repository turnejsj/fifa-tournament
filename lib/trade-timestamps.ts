/**
 * Parse US-style timestamps used in Tradovate exports, e.g. `04/24/2026 14:30:04`.
 * Returns a local `Date` suitable for calendar grouping and ISO trade_date strings.
 */
export function parseUsSlashDateTime(value: string): Date | null {
  const s = String(value ?? "").trim()
  if (!s) return null

  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/
  )
  if (m) {
    const month = Number(m[1]) - 1
    const day = Number(m[2])
    const year = Number(m[3])
    const hh = m[4] != null ? Number(m[4]) : 0
    const mm = m[5] != null ? Number(m[5]) : 0
    const ss = m[6] != null ? Number(m[6]) : 0
    const d = new Date(year, month, day, hh, mm, ss)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Local wall-clock ISO fragment `YYYY-MM-DDTHH:mm:ss` (no timezone suffix). */
export function toLocalIsoDateTime(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  const sec = String(d.getSeconds()).padStart(2, "0")
  return `${y}-${mo}-${day}T${h}:${min}:${sec}`
}

/** Calendar key `YYYY-MM-DD` for grouping (Performance daily, calendar cells). */
export function toCalendarDayKey(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}
