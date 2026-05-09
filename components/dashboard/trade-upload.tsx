"use client"

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react"
import { UploadCloud, FileSpreadsheet } from "lucide-react"
import { Trade } from "@/lib/trades"
import { DbTradeRow, insertTrades, toDashboardTrade } from "@/lib/trade-store"
import { parseTradovateOrdersCsv, type TradovateParsedTradeRow } from "@/lib/tradovate-orders-csv"
import { cn } from "@/lib/utils"

type ParsedTradeRow = TradovateParsedTradeRow

interface TradeUploadProps {
  onTradesParsed?: (trades: Trade[]) => void
  onTradesSaved?: (trades: Trade[]) => void
}

const TITAN_BLUE = "#00A3FF"

const formatCurrency = (value: number) => {
  const sign = value < 0 ? "-" : ""
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function TradeUpload({ onTradesParsed, onTradesSaved }: TradeUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<ParsedTradeRow[]>([])
  const [mistakeTag, setMistakeTag] = useState<"None" | "FOMO" | "Chasing">("None")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totals = useMemo(() => {
    const totalNetPnL = rows.reduce((sum, row) => sum + row.netPnL, 0)
    const wins = rows.filter((row) => row.netPnL > 0).length
    const losses = rows.filter((row) => row.netPnL < 0).length
    return { totalNetPnL, wins, losses }
  }, [rows])

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setErrorMessage("")

    try {
      const content = await file.text()
      const parsedRows = parseTradovateOrdersCsv(content)
      const taggedRows = parsedRows.map((row) => ({ ...row, mistakeTag }))
      const dbRows: DbTradeRow[] = parsedRows.map((row) => ({
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
      const insertedRows = await insertTrades(dbRows)
      const dashboardTrades = insertedRows.map(toDashboardTrade)
      window.dispatchEvent(new Event("trades-updated"))

      setRows(taggedRows)
      setFileName(file.name)
      onTradesParsed?.(dashboardTrades)
      onTradesSaved?.(dashboardTrades)
    } catch (error) {
      setRows([])
      setFileName("")
      onTradesParsed?.([])
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to parse CSV file."
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFile(file)
    event.target.value = ""
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    await processFile(file)
  }

  return (
    <section className="mb-6 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">TradeUpload</h2>
          <p className="text-sm text-slate-400">
            Upload a Tradovate Orders CSV (Date, B/S, Contract, Quantity, Price).
          </p>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{
            color: TITAN_BLUE,
            borderColor: "rgba(0, 163, 255, 0.4)",
            backgroundColor: "rgba(0, 163, 255, 0.08)",
          }}
        >
          TitanLog
        </span>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-slate-300">Mistake Tag</label>
        <select
          value={mistakeTag}
          onChange={(event) =>
            setMistakeTag(event.target.value as "None" | "FOMO" | "Chasing")
          }
          className="rounded-md border border-[#2b3b53] bg-[#0a1324] px-2 py-1 text-sm text-white"
        >
          <option value="None">None</option>
          <option value="FOMO">FOMO</option>
          <option value="Chasing">Chasing</option>
        </select>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all",
          isDragging
            ? "border-[#00A3FF] bg-[#001a2b]"
            : "border-[#2b3b53] bg-[#0a1324] hover:border-[#00A3FF]/70 hover:bg-[#0d1a31]"
        )}
      >
        <UploadCloud className="mb-3 h-10 w-10 text-[#00A3FF]" />
        <p className="text-base font-semibold text-white">
          Drag and Drop your CSV here
        </p>
        <p className="mt-1 text-sm text-slate-400">
          or click to browse files from your computer
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {isProcessing && (
        <p className="mt-3 text-sm text-[#7acfff]">Processing CSV...</p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-md bg-[#0d1a31] px-3 py-1.5 text-slate-200">
              <FileSpreadsheet className="h-4 w-4 text-[#00A3FF]" />
              <span className="font-medium">{fileName}</span>
            </div>
            <div className="rounded-md bg-[#0d1a31] px-3 py-1.5 text-slate-300">
              Trades: <span className="font-semibold text-white">{rows.length}</span>
            </div>
            <div className="rounded-md bg-[#0d1a31] px-3 py-1.5 text-slate-300">
              Wins: <span className="font-semibold text-[#00F081]">{totals.wins}</span>
            </div>
            <div className="rounded-md bg-[#0d1a31] px-3 py-1.5 text-slate-300">
              Losses: <span className="font-semibold text-[#FF4D4D]">{totals.losses}</span>
            </div>
            <div className="rounded-md bg-[#0d1a31] px-3 py-1.5 text-slate-300">
              Total Net P&L:{" "}
              <span
                className={cn(
                  "font-semibold",
                  totals.totalNetPnL >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
                )}
              >
                {formatCurrency(totals.totalNetPnL)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#1A1A1A]">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#0d1a31] text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2 text-left font-medium">Side</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Entry</th>
                  <th className="px-3 py-2 text-right font-medium">Exit</th>
                  <th className="px-3 py-2 text-right font-medium">Net P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.date}-${row.symbol}-${index}`}
                    className="border-t border-[#1b2a40] bg-[#070f1d] text-slate-200"
                  >
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.symbol}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-semibold",
                          row.side === "Long"
                            ? "bg-[#12305a] text-[#7acfff]"
                            : "bg-[#1f120f] text-[#FF4D4D]"
                        )}
                      >
                        {row.side}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{row.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.entryPrice)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.exitPrice)}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        row.netPnL >= 0 ? "text-[#00F081]" : "text-[#FF4D4D]"
                      )}
                    >
                      {formatCurrency(row.netPnL)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
