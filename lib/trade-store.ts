import { Trade } from "@/lib/trades"
import { supabase } from "@/lib/supabase-client"
import { dedupeDbTradeRowsForUpsert } from "@/lib/trade-dedupe"

export interface DbTradeRow {
  id?: string
  order_id: string
  trade_date: string
  exit_time?: string | null
  symbol: string
  side: "Long" | "Short"
  quantity: number
  entry_price: number
  exit_price?: number | null
  net_pnl: number
  /** Max favorable run-up ($) while the trade was open; when set, trailing HWM uses this instead of closed P&L alone. */
  max_runup?: number | null
  account: string
  mistake_tag?: "None" | "FOMO" | "Chasing" | null
  commission?: number | null
  created_at?: string
}

export const toDashboardTrade = (row: DbTradeRow): Trade => ({
  closeDate: row.trade_date,
  symbol: row.symbol,
  netPnL: row.net_pnl,
  account: row.account,
})

export const insertTrades = async (rows: DbTradeRow[]): Promise<DbTradeRow[]> => {
  if (rows.length === 0) return []

  const deduped = dedupeDbTradeRowsForUpsert(rows)

  const { data, error } = await supabase
    .from("trades")
    .upsert(deduped, { onConflict: "order_id" })
    .select("*")

  if (error) {
    const message = String(error.message ?? "")
    if (message.toLowerCase().includes("mistake_tag")) {
      // Graceful fallback for environments where mistake_tag column is not present yet.
      const sanitizedRows = deduped.map(({ mistake_tag: _ignored, ...rest }) => rest)
      const retry = await supabase
        .from("trades")
        .upsert(sanitizedRows, { onConflict: "order_id" })
        .select("*")
      if (retry.error) throw retry.error
      return (retry.data ?? []) as DbTradeRow[]
    }
    throw error
  }
  return (data ?? []) as DbTradeRow[]
}

export const fetchTrades = async (): Promise<DbTradeRow[]> => {
  try {
    const primary = await supabase
      .from("trades")
      .select(
        "id, order_id, trade_date, exit_time, symbol, side, quantity, entry_price, exit_price, net_pnl, account, commission, created_at"
      )
      .order("trade_date", { ascending: true })
      .order("created_at", { ascending: true })

    if (!primary.error) return (primary.data ?? []) as DbTradeRow[]

    const fallback = await supabase
      .from("trades")
      .select(
        "id, order_id, trade_date, exit_time, symbol, side, quantity, entry_price, exit_price, net_pnl, account, commission, created_at"
      )
      .order("trade_date", { ascending: true })

    if (!fallback.error) return (fallback.data ?? []) as DbTradeRow[]

    console.warn("[fetchTrades]", fallback.error.message ?? fallback.error)
    return []
  } catch (e) {
    console.warn("[fetchTrades] unexpected", e)
    return []
  }
}
