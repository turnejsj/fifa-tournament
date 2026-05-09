import { supabase } from "@/lib/supabase-client"

export interface PerformanceDailyRow {
  account: string
  day: string
  net_total: number
}

export async function upsertPerformanceDaily(rows: PerformanceDailyRow[]): Promise<void> {
  if (rows.length === 0) return

  const payload = rows.map((r) => ({
    account: r.account,
    day: r.day,
    net_total: r.net_total,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("performance_daily").upsert(payload, {
    onConflict: "account,day",
  })

  if (error) {
    const msg = String(error.message ?? "")
    if (msg.toLowerCase().includes("relation") || error.code === "42P01") {
      throw new Error(
        'Supabase table "performance_daily" is missing. Run `supabase/performance_daily.sql` in the SQL editor.'
      )
    }
    throw error
  }
}

/** Normalize `day` from PostgREST (string or date) to `YYYY-MM-DD`. */
function normalizePerformanceDay(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") {
    const s = value.trim()
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1]! : s.slice(0, 10)
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear()
    const mo = String(value.getUTCMonth() + 1).padStart(2, "0")
    const d = String(value.getUTCDate()).padStart(2, "0")
    return `${y}-${mo}-${d}`
  }
  return ""
}

function safeNetTotal(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Load rows from `public.performance_daily` (account + calendar day + net_total).
 * Returns `[]` when the table is empty, on error, or if the response is not an array — never throws.
 */
export async function fetchPerformanceDaily(): Promise<PerformanceDailyRow[]> {
  try {
    const { data, error } = await supabase
      .from("performance_daily")
      .select("account, day, net_total")
      .order("day", { ascending: true })

    if (error) {
      console.warn("[fetchPerformanceDaily]", error.message ?? error)
      return []
    }

    const rows = Array.isArray(data) ? data : []
    if (rows.length === 0) return []

    const out: PerformanceDailyRow[] = []
    for (const row of rows as { account?: unknown; day?: unknown; net_total?: unknown }[]) {
      const account = String(row?.account ?? "").trim() || "Apex"
      const day = normalizePerformanceDay(row?.day)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue

      out.push({
        account,
        day,
        net_total: safeNetTotal(row?.net_total),
      })
    }

    return out.sort((a, b) => a.day.localeCompare(b.day))
  } catch (e) {
    console.warn("[fetchPerformanceDaily] unexpected", e)
    return []
  }
}
