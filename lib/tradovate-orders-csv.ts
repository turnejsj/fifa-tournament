import Papa from "papaparse"
import { stripAccountingPnlToNumber } from "@/lib/pnl-parse"
import { parseUsSlashDateTime, toLocalIsoDateTime } from "@/lib/trade-timestamps"

export interface TradovateParsedTradeRow {
  orderId: string
  date: string
  symbol: string
  side: "Long" | "Short"
  quantity: number
  entryPrice: number
  exitPrice: number
  netPnL: number
  account: string
  mistakeTag: "None" | "FOMO" | "Chasing"
}

interface RawFillRow {
  /** Groups partial fills of the same broker order (Tradovate "Order ID"). */
  mergeId: string
  /** Stable key for Supabase `order_id` (fill id(s) when present). */
  orderId: string
  date: string
  symbol: string
  side: "Long" | "Short"
  quantity: number
  price: number
  account: string
  isCompleteTrade?: boolean
  netPnLOverride?: number
  entryPriceOverride?: number
  exitPriceOverride?: number
}

interface OpenTradeState {
  side: "Long" | "Short"
  entryQuantity: number
  entryPriceWeightedSum: number
  exitQuantity: number
  exitPriceWeightedSum: number
  openedAt: string
  account: string
}

type ParsedCsvRow = Record<string, string | number | null | undefined>

const normalizeHeader = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim()

const normalizeOrderId = (value: string) => value.trim()

const DATE_HEADER_REGEX = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/

const APEX_ROUND_TURN_FEE = 1.04
const MNQ_POINT_MULTIPLIER = 2

const toSide = (bsValue: string): "Long" | "Short" | null => {
  const normalized = bsValue.trim().toLowerCase()
  if (normalized === "buy" || normalized === "b") return "Long"
  if (normalized === "sell" || normalized === "s") return "Short"
  return null
}

const isDateCell = (value: string) => DATE_HEADER_REGEX.test(value.trim())

const parseTradeDate = (timestampValue: string, fallbackDate: string) => {
  const normalizedTimestamp = timestampValue.trim()
  if (normalizedTimestamp) {
    const us = parseUsSlashDateTime(normalizedTimestamp)
    if (us) {
      const hasTime = normalizedTimestamp.includes(":")
      if (hasTime) return toLocalIsoDateTime(us)
      const year = us.getFullYear()
      const month = String(us.getMonth() + 1).padStart(2, "0")
      const day = String(us.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    const parsed = new Date(normalizedTimestamp)
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear()
      const month = String(parsed.getMonth() + 1).padStart(2, "0")
      const day = String(parsed.getDate()).padStart(2, "0")
      const hasTime = normalizedTimestamp.includes(":")
      if (hasTime) {
        const hours = String(parsed.getHours()).padStart(2, "0")
        const minutes = String(parsed.getMinutes()).padStart(2, "0")
        const seconds = String(parsed.getSeconds()).padStart(2, "0")
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }
      return `${year}-${month}-${day}`
    }
  }

  const dateCandidate = fallbackDate.trim()
  const mmddyyMatch = dateCandidate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mmddyyMatch) {
    const month = String(Number(mmddyyMatch[1])).padStart(2, "0")
    const day = String(Number(mmddyyMatch[2])).padStart(2, "0")
    const rawYear = Number(mmddyyMatch[3])
    const year = rawYear < 100 ? 2000 + rawYear : rawYear
    return `${year}-${month}-${day}`
  }

  return dateCandidate
}

/** Tradovate Orders / Trades export: fills and completed trades with Net P/L. */
export function parseTradovateOrdersCsv(csvText: string): TradovateParsedTradeRow[] {
  const lines = csvText.split(/\r?\n/)
  let headerLineIndex = -1

  for (let i = 0; i < lines.length; i += 1) {
    const normalizedLine = lines[i].toLowerCase()
    if (
      normalizedLine.includes("order id") &&
      normalizedLine.includes("b/s") &&
      normalizedLine.includes("quantity") &&
      normalizedLine.includes("contract")
    ) {
      headerLineIndex = i
      break
    }
  }

  if (headerLineIndex < 0) {
    throw new Error("Could not find ORDER ID header row in this Tradovate export.")
  }

  const csvBody = lines.slice(headerLineIndex).join("\n")
  const results = Papa.parse<ParsedCsvRow>(csvBody, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => normalizeHeader(header),
  })

  if (results.errors.length > 0) {
    throw new Error(results.errors[0].message || "Failed to parse CSV file.")
  }

  if (!results.data || results.data.length === 0) {
    throw new Error("CSV must include a header row and at least one trade row.")
  }

  let activeDate = ""
  const rawRows: RawFillRow[] = []
  const seenFillKeys = new Set<string>()

  for (let rowIndex = 0; rowIndex < results.data.length; rowIndex += 1) {
    const row = results.data[rowIndex]
    const orderIdCell = String(row["order id"] ?? "").trim()

    if (
      isDateCell(orderIdCell) &&
      !String(row["contract"] ?? "").trim() &&
      !String(row["quantity"] ?? "").trim()
    ) {
      activeDate = orderIdCell
      continue
    }

    const orderIdRaw = normalizeOrderId(orderIdCell)
    const buyFill = String(row["buy fill id"] ?? row["buyfillid"] ?? "").trim()
    const sellFill = String(row["sell fill id"] ?? row["sellfillid"] ?? "").trim()
    const fillLineKey =
      buyFill && sellFill ? `${buyFill}|${sellFill}` : buyFill || sellFill || ""

    const symbol = String(row["contract"] ?? "").trim()
    const side = toSide(String(row["b/s"] ?? ""))
    const quantity = parseFloat(String(row["quantity"] ?? ""))
    const status = String(row["status"] ?? "").trim().toLowerCase()
    const avgFillPrice = parseFloat(String(row["avg fill price"] ?? ""))
    const rawNetCell = String(row["net p&l"] ?? row["p&l"] ?? row["pnl"] ?? "")
    const netFromStrip = stripAccountingPnlToNumber(rawNetCell)
    const netPnlFromCsv =
      netFromStrip ??
      (Number.isFinite(parseFloat(rawNetCell)) ? parseFloat(rawNetCell) : NaN)
    const rowDate = parseTradeDate(
      String(row["timestamp"] ?? "").trim() || String(row["date"] ?? "").trim(),
      activeDate
    )
    const account = String(row["account"] ?? "").trim() || "Apex"

    if (status && status !== "filled") continue

    const normalizedQuantity = Number.isFinite(quantity) ? Math.abs(quantity) : NaN
    const normalizedPrice = Number.isFinite(avgFillPrice) ? avgFillPrice : NaN

    if (
      !rowDate ||
      !symbol ||
      !Number.isFinite(normalizedQuantity) ||
      side === null ||
      !Number.isFinite(normalizedPrice)
    )
      continue

    const mergeId =
      orderIdRaw ||
      `${symbol}|${rowDate}|${side}|${normalizedQuantity}|${normalizedPrice}`
    const lineDedupeKey =
      fillLineKey ||
      `${mergeId}|${symbol}|${rowDate}|${side}|${normalizedQuantity}|${normalizedPrice}`
    if (seenFillKeys.has(lineDedupeKey)) continue
    seenFillKeys.add(lineDedupeKey)

    const orderIdForRow = fillLineKey || mergeId

    if (Number.isFinite(netPnlFromCsv)) {
      rawRows.push({
        mergeId,
        orderId: orderIdForRow,
        date: rowDate,
        symbol,
        side,
        quantity: normalizedQuantity,
        price: normalizedPrice,
        account,
        isCompleteTrade: true,
        netPnLOverride: netPnlFromCsv,
        entryPriceOverride: normalizedPrice,
        exitPriceOverride: normalizedPrice,
      })
      continue
    }

    rawRows.push({
      mergeId,
      orderId: orderIdForRow,
      date: rowDate,
      symbol,
      side,
      quantity: normalizedQuantity,
      price: normalizedPrice,
      account,
    })
  }

  const mergedRowsMap = new Map<string, RawFillRow>()
  for (const row of rawRows) {
    const existing = mergedRowsMap.get(row.mergeId)
    if (!existing) {
      mergedRowsMap.set(row.mergeId, { ...row })
      continue
    }

    const totalQty = existing.quantity + row.quantity
    const weightedPrice =
      (existing.price * existing.quantity + row.price * row.quantity) / totalQty

    existing.quantity = totalQty
    existing.price = weightedPrice
    const fillParts = [existing.orderId, row.orderId].filter(Boolean)
    const uniqueFills = [...new Set(fillParts)]
    if (uniqueFills.length > 1) {
      existing.orderId = uniqueFills.sort().join("|")
    }
  }

  const mergedRows = Array.from(mergedRowsMap.values())

  const openTradesBySymbol = new Map<string, OpenTradeState>()
  const parsedRows: TradovateParsedTradeRow[] = []

  for (const row of mergedRows) {
    if (row.isCompleteTrade && row.netPnLOverride !== undefined) {
      parsedRows.push({
        orderId: row.orderId,
        date: row.date,
        symbol: row.symbol,
        side: row.side,
        quantity: row.quantity,
        entryPrice: row.entryPriceOverride ?? row.price,
        exitPrice: row.exitPriceOverride ?? row.price,
        netPnL: row.netPnLOverride,
        account: row.account,
        mistakeTag: "None",
      })
      continue
    }

    const existingTrade = openTradesBySymbol.get(row.symbol)

    if (!existingTrade) {
      openTradesBySymbol.set(row.symbol, {
        side: row.side,
        entryQuantity: row.quantity,
        entryPriceWeightedSum: row.price * row.quantity,
        exitQuantity: 0,
        exitPriceWeightedSum: 0,
        openedAt: row.date,
        account: row.account,
      })
      continue
    }

    if (existingTrade.side === row.side && existingTrade.exitQuantity === 0) {
      existingTrade.entryQuantity += row.quantity
      existingTrade.entryPriceWeightedSum += row.price * row.quantity
      continue
    }

    if (existingTrade.side !== row.side) {
      existingTrade.exitQuantity += row.quantity
      existingTrade.exitPriceWeightedSum += row.price * row.quantity
    }

    if (existingTrade.exitQuantity < existingTrade.entryQuantity) {
      continue
    }

    const quantity = existingTrade.entryQuantity
    const entryPrice = existingTrade.entryPriceWeightedSum / quantity
    const exitPrice = existingTrade.exitPriceWeightedSum / existingTrade.exitQuantity

    const pnlPerPointMultiplier = row.symbol
      .trim()
      .toUpperCase()
      .startsWith("MNQ")
      ? MNQ_POINT_MULTIPLIER
      : 1
    const grossPnL =
      existingTrade.side === "Long"
        ? (exitPrice - entryPrice) * pnlPerPointMultiplier * quantity
        : (entryPrice - exitPrice) * pnlPerPointMultiplier * quantity
    const fees = APEX_ROUND_TURN_FEE * quantity
    const netPnL = grossPnL - fees

    parsedRows.push({
      orderId: row.orderId,
      date: existingTrade.openedAt,
      symbol: row.symbol,
      side: existingTrade.side,
      quantity,
      entryPrice,
      exitPrice,
      netPnL,
      account: existingTrade.account,
      mistakeTag: "None",
    })

    const extraExitQuantity = existingTrade.exitQuantity - existingTrade.entryQuantity
    if (extraExitQuantity > 0) {
      openTradesBySymbol.set(row.symbol, {
        side: row.side,
        entryQuantity: extraExitQuantity,
        entryPriceWeightedSum: row.price * extraExitQuantity,
        exitQuantity: 0,
        exitPriceWeightedSum: 0,
        openedAt: row.date,
        account: row.account,
      })
    } else {
      openTradesBySymbol.delete(row.symbol)
    }
  }

  return parsedRows
}
