export interface Trade {
  closeDate: string
  symbol: string
  netPnL: number
  /** Present when trade came from Supabase / Tradovate import */
  account?: string
}

export interface TitanScoreBreakdown {
  score: number
  profitabilityPoints: number
  disciplinePoints: number
  consistencyPoints: number
  profitFactor: number
  winRate: number
  respectedDailyLossLimit: boolean
}

const CANDIDATE_PNL_HEADERS = [
  "netpnl",
  "net_pnl",
  "net p&l",
  "net p/l",
  "pnl",
  "p&l",
  "profit",
  "profitloss",
]

const CANDIDATE_SYMBOL_HEADERS = ["symbol", "ticker", "instrument", "asset"]
const CANDIDATE_DATE_HEADERS = ["closedate", "date", "close date", "exitdate"]

const normalizeHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "")

const parsePnL = (value: string): number | null => {
  const cleaned = value.replace(/[$,\s]/g, "")
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

export const parseTradesCsv = (csvText: string): Trade[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((header) => header.trim())
  const normalizedHeaders = headers.map(normalizeHeader)

  const pnlIndex = normalizedHeaders.findIndex((header) =>
    CANDIDATE_PNL_HEADERS.includes(header)
  )
  const symbolIndex = normalizedHeaders.findIndex((header) =>
    CANDIDATE_SYMBOL_HEADERS.includes(header)
  )
  const dateIndex = normalizedHeaders.findIndex((header) =>
    CANDIDATE_DATE_HEADERS.includes(header)
  )

  if (pnlIndex < 0) return []

  return lines.slice(1).flatMap((line) => {
    const cells = line.split(",").map((cell) => cell.trim())
    const netPnL = parsePnL(cells[pnlIndex] ?? "")
    if (netPnL === null) return []

    return [
      {
        closeDate: cells[dateIndex] ?? "N/A",
        symbol: cells[symbolIndex] ?? "N/A",
        netPnL,
      },
    ]
  })
}

export const hasThreeLosingTradesInARow = (trades: Trade[]): boolean => {
  let losingStreak = 0

  for (const trade of trades) {
    if (trade.netPnL < 0) {
      losingStreak += 1
      if (losingStreak >= 3) return true
    } else {
      losingStreak = 0
    }
  }

  return false
}

export const calculateTitanScore = (
  trades: Trade[],
  dailyLossLimit = 2000
): TitanScoreBreakdown => {
  if (trades.length === 0) {
    return {
      score: 0,
      profitabilityPoints: 0,
      disciplinePoints: 0,
      consistencyPoints: 0,
      profitFactor: 0,
      winRate: 0,
      respectedDailyLossLimit: false,
    }
  }

  let grossProfit = 0
  let grossLoss = 0
  let wins = 0
  const dailyPnL = new Map<string, number>()

  for (const trade of trades) {
    if (trade.netPnL > 0) {
      grossProfit += trade.netPnL
      wins += 1
    } else if (trade.netPnL < 0) {
      grossLoss += Math.abs(trade.netPnL)
    }

    const runningDailyPnL = dailyPnL.get(trade.closeDate) ?? 0
    dailyPnL.set(trade.closeDate, runningDailyPnL + trade.netPnL)
  }

  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss
  const winRate = (wins / trades.length) * 100
  const respectedDailyLossLimit = Array.from(dailyPnL.values()).every(
    (pnl) => pnl >= -Math.abs(dailyLossLimit)
  )

  const profitabilityPoints = profitFactor > 1.5 ? 40 : 0
  const disciplinePoints = respectedDailyLossLimit ? 30 : 0
  const consistencyPoints = winRate > 50 ? 30 : 0
  const score = profitabilityPoints + disciplinePoints + consistencyPoints

  return {
    score,
    profitabilityPoints,
    disciplinePoints,
    consistencyPoints,
    profitFactor,
    winRate,
    respectedDailyLossLimit,
  }
}
