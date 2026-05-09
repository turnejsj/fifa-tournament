import { DbTradeRow } from "@/lib/trade-store"

function hash32(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36).slice(0, 12)
}

/**
 * Dedupe before Supabase upsert: `order_id` is usually Tradovate fill id(s) or Order ID;
 * otherwise fingerprint by symbol, trade time, side, qty, entry, and net.
 */
export function dedupeDbTradeRowsForUpsert(rows: DbTradeRow[]): DbTradeRow[] {
  const map = new Map<string, DbTradeRow>()
  for (const r of rows) {
    const oid = String(r.order_id ?? "").trim()
    const fingerprint = `${r.symbol}|${r.trade_date}|${r.side}|${r.quantity}|${r.entry_price}|${r.net_pnl}`
    const key = oid.length > 0 ? `o:${oid}` : `t:${fingerprint}`
    const order_id = oid.length > 0 ? oid : `fill-${hash32(fingerprint)}`
    map.set(key, { ...r, order_id })
  }
  return [...map.values()]
}
