export type ParsedScoreline = {
  homeScore: number
  awayScore: number
}

const SCORELINE_PATTERN =
  /\b(\d{1,2})\s*[-:–—|]\s*(\d{1,2})\b|\b(\d{1,2})\s{2,}\s*(\d{1,2})\b/g

function isValidScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 99
}

function pairFromMatch(match: RegExpExecArray): ParsedScoreline | null {
  const home = Number(match[1] ?? match[3])
  const away = Number(match[2] ?? match[4])
  if (!isValidScore(home) || !isValidScore(away)) return null
  return { homeScore: home, awayScore: away }
}

/** Extract a home/away scoreline from raw OCR text (e.g. TV broadcast overlay). */
export function parseScorelineFromOcr(text: string): ParsedScoreline | null {
  const cleaned = text
    .replace(/\r/g, "\n")
    .replace(/[Oo]/g, "0")
    .replace(/[|Il]/g, "1")
    .trim()

  if (!cleaned) return null

  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    SCORELINE_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = SCORELINE_PATTERN.exec(trimmed)) !== null) {
      const pair = pairFromMatch(match)
      if (pair) return pair
    }
  }

  SCORELINE_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = SCORELINE_PATTERN.exec(cleaned)) !== null) {
    const pair = pairFromMatch(match)
    if (pair) return pair
  }

  const numbers = [...cleaned.matchAll(/\b(\d{1,2})\b/g)]
    .map((m) => Number(m[1]))
    .filter(isValidScore)

  if (numbers.length >= 2) {
    return { homeScore: numbers[0], awayScore: numbers[1] }
  }

  return null
}
