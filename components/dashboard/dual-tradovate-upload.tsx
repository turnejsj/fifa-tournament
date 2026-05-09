"use client"

import { useRef, useState } from "react"
import { Activity, Upload } from "lucide-react"
import { Trade } from "@/lib/trades"
import { DbTradeRow, insertTrades, toDashboardTrade } from "@/lib/trade-store"
import { parseTradovateOrdersCsv } from "@/lib/tradovate-orders-csv"
import { parsePerformanceDailyCsv } from "@/lib/tradovate-performance-csv"
import { upsertPerformanceDaily } from "@/lib/performance-daily-store"
import { cn } from "@/lib/utils"

interface DualTradovateUploadProps {
  onTradesParsed?: (trades: Trade[]) => void
  onSynced?: () => void
}

async function backupCsvToBlob(file: File): Promise<{ skipped?: boolean; url?: string }> {
  try {
    const body = new FormData()
    body.append("file", file)
    const res = await fetch("/api/csv-backup", { method: "POST", body })
    const json = (await res.json()) as { skipped?: boolean; url?: string; error?: string }
    if (!res.ok && json.error) {
      console.warn("Blob backup failed:", json.error)
      return { skipped: true }
    }
    return json
  } catch (e) {
    console.warn("Blob backup request failed:", e)
    return { skipped: true }
  }
}

const btnClass =
  "inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors"

export function DualTradovateUpload({ onTradesParsed, onSynced }: DualTradovateUploadProps) {
  const [isProcessingPerformance, setIsProcessingPerformance] = useState(false)
  const [isProcessingOrders, setIsProcessingOrders] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [performanceLoaded, setPerformanceLoaded] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [mistakeTag, setMistakeTag] = useState<"None" | "FOMO" | "Chasing">("None")
  const perfInputRef = useRef<HTMLInputElement>(null)
  const ordersInputRef = useRef<HTMLInputElement>(null)

  const processPerformance = async (file: File) => {
    setIsProcessingPerformance(true)
    setErrorMessage("")
    try {
      const text = await file.text()
      await backupCsvToBlob(file)
      let daily: ReturnType<typeof parsePerformanceDailyCsv> = []
      try {
        daily = parsePerformanceDailyCsv(text)
      } catch (e) {
        console.error("[Performance CSV]", e)
        setErrorMessage("Could not read that Performance CSV. Check the file format.")
        return
      }
      if (daily.length === 0) {
        setErrorMessage(
          "No daily rows could be built. Ensure columns like boughtTimestamp and pnl exist and contain valid values."
        )
        return
      }
      try {
        await upsertPerformanceDaily(daily)
      } catch (e) {
        console.error("[performance_daily upsert]", e)
        setErrorMessage(
          e instanceof Error ? e.message : "Could not save performance data (Supabase)."
        )
        return
      }
      setPerformanceLoaded(true)
      window.dispatchEvent(new Event("trades-updated"))
      onSynced?.()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Performance upload failed.")
    } finally {
      setIsProcessingPerformance(false)
    }
  }

  const processOrders = async (file: File) => {
    setIsProcessingOrders(true)
    setErrorMessage("")
    try {
      const text = await file.text()
      await backupCsvToBlob(file)
      let parsedRows: ReturnType<typeof parseTradovateOrdersCsv> = []
      try {
        parsedRows = parseTradovateOrdersCsv(text)
      } catch (e) {
        console.error("[Orders CSV]", e)
        setErrorMessage(
          e instanceof Error ? e.message : "Could not parse that Orders CSV. Check the file format."
        )
        return
      }
      const taggedRows = parsedRows.map((row) => ({
        ...row,
        mistakeTag,
      }))
      const dbRows: DbTradeRow[] = taggedRows.map((row) => ({
        order_id: row.orderId,
        symbol: row.symbol,
        side: row.side,
        quantity: parseFloat(String(row.quantity)),
        trade_date: row.date,
        entry_price: parseFloat(String(row.entryPrice)),
        exit_price: parseFloat(String(row.exitPrice)),
        net_pnl: parseFloat(String(row.netPnL)),
        account: row.account,
        mistake_tag: (mistakeTag === "None" ? null : mistakeTag) as DbTradeRow["mistake_tag"],
      }))
      let insertedRows: DbTradeRow[] = []
      try {
        insertedRows = await insertTrades(dbRows)
      } catch (e) {
        console.error("[insertTrades]", e)
        setErrorMessage(e instanceof Error ? e.message : "Could not save trades to Supabase.")
        return
      }
      const dashboardTrades = insertedRows.map(toDashboardTrade)
      setOrdersLoaded(true)
      window.dispatchEvent(new Event("trades-updated"))
      onTradesParsed?.(dashboardTrades)
      onSynced?.()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Orders upload failed.")
    } finally {
      setIsProcessingOrders(false)
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Tradovate data</h2>
        <p className="text-sm text-zinc-400">
          Performance → withdrawal goal &amp; 50% rule from daily nets. Orders → charts &amp; trade
          list.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isProcessingPerformance}
          onClick={() => perfInputRef.current?.click()}
          className={cn(
            btnClass,
            "border-[#00F081]/50 bg-[#00F081]/10 text-[#00F081] hover:bg-[#00F081]/20",
            isProcessingPerformance && "pointer-events-none opacity-60"
          )}
        >
          <Activity className="size-4 shrink-0" />
          Upload Performance CSV
        </button>
        <button
          type="button"
          disabled={isProcessingOrders}
          onClick={() => ordersInputRef.current?.click()}
          className={cn(
            btnClass,
            "border-[#00F081]/50 bg-[#00F081]/10 text-[#00F081] hover:bg-[#00F081]/20",
            isProcessingOrders && "pointer-events-none opacity-60"
          )}
        >
          <Upload className="size-4 shrink-0" />
          Upload Orders CSV
        </button>
        <input
          ref={perfInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (f) await processPerformance(f)
          }}
        />
        <input
          ref={ordersInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (f) await processOrders(f)
          }}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-400">Mistake tag (orders only)</span>
        <select
          value={mistakeTag}
          onChange={(e) => setMistakeTag(e.target.value as "None" | "FOMO" | "Chasing")}
          className="rounded-md border border-[#1A1A1A] bg-[#050505] px-2 py-1.5 text-sm text-white focus:border-[#00F081] focus:outline-none focus:ring-1 focus:ring-[#00F081]/40"
        >
          <option value="None">None</option>
          <option value="FOMO">FOMO</option>
          <option value="Chasing">Chasing</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-[#1A1A1A] bg-[#0a0a0a] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Sync status
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            performanceLoaded ? "bg-[#00F081]/15 text-[#00F081]" : "bg-zinc-800 text-zinc-500"
          )}
        >
          Performance data loaded
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            ordersLoaded ? "bg-[#00F081]/15 text-[#00F081]" : "bg-zinc-800 text-zinc-500"
          )}
        >
          Order details loaded
        </span>
      </div>

      {(isProcessingPerformance || isProcessingOrders) && (
        <p className="mt-3 text-sm text-[#00F081]">Processing…</p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </section>
  )
}
