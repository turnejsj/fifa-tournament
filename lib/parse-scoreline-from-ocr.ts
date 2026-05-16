export type ParsedScoreboard = {
  homeTeamName: string
  homeScore: number
  awayScore: number
  awayTeamName: string
}

export type ScoreboardFormFill = {
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}

type TeamOption = { id: string; name: string }

type TeamHit = { team: TeamOption; index: number; length: number }

type ScorePair = { first: number; second: number }

const SCORE_PAIR_PATTERNS = [
  /(\d{1,2})\s*-\s*(\d{1,2})/,
  /(\d{1,2})\s+(\d{1,2})/,
  /(\d{1,2})[^\dA-Z]{1,6}(\d{1,2})/,
]

/** Strip junk, uppercase, and normalize separators between digits to hyphens. */
export function cleanupOcrText(text: string): string {
  return text
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .toUpperCase()
    .replace(/[Oo]/g, "0")
    .replace(/(\d)\s*[^\dA-Z]+\s*(\d)/g, "$1-$2")
    .replace(/[^A-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeTeamKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function teamNamesMatch(ocrName: string, knownName: string): boolean {
  const a = normalizeTeamKey(ocrName)
  const b = normalizeTeamKey(knownName)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function isValidScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 99
}

function toScorePair(match: RegExpMatchArray): ScorePair | null {
  const first = Number(match[1])
  const second = Number(match[2])
  if (!isValidScore(first) || !isValidScore(second)) return null
  return { first, second }
}

/** Find two scores even when fonts/OCR insert odd characters between digits. */
export function extractScorePair(text: string): ScorePair | null {
  for (const pattern of SCORE_PAIR_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const pair = toScorePair(match)
      if (pair) return pair
    }
  }

  const digits = [...text.matchAll(/\b(\d{1,2})\b/g)]
    .map((m) => Number(m[1]))
    .filter(isValidScore)

  if (digits.length >= 2) {
    return { first: digits[0], second: digits[1] }
  }

  return null
}

function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end
}

function findTeamIndex(cleaned: string, teamName: string): { index: number; length: number } | null {
  const upper = teamName.toUpperCase().trim()
  if (!upper) return null

  const direct = cleaned.indexOf(upper)
  if (direct !== -1) return { index: direct, length: upper.length }

  const compactNeedle = normalizeTeamKey(upper)
  const compactHaystack = normalizeTeamKey(cleaned)
  const compactIndex = compactHaystack.indexOf(compactNeedle)
  if (compactIndex === -1) return null

  return { index: compactIndex, length: compactNeedle.length }
}

/** Find up to two tournament teams mentioned in OCR text (order preserved). */
export function findTeamsInOcrText(cleaned: string, teams: TeamOption[]): TeamHit[] {
  const sortedByLength = [...teams].sort((a, b) => b.name.length - a.name.length)
  const hits: TeamHit[] = []
  const usedRanges: { start: number; end: number }[] = []

  for (const team of sortedByLength) {
    const found = findTeamIndex(cleaned, team.name)
    if (!found) continue

    const range = { start: found.index, end: found.index + found.length }
    if (usedRanges.some((r) => rangesOverlap(r, range))) continue

    usedRanges.push(range)
    hits.push({ team, index: found.index, length: found.length })
  }

  return hits.sort((a, b) => a.index - b.index).slice(0, 2)
}

function resolveTeamId(teams: TeamOption[], teamName: string): string | null {
  return teams.find((t) => teamNamesMatch(teamName, t.name))?.id ?? null
}

/**
 * Map parsed broadcast data to form fields. Scores follow text order (first team
 * gets first extracted score). Player profile team is used to validate sides.
 */
export function applyScoreboardToForm(
  parsed: ParsedScoreboard,
  teams: TeamOption[],
  playerTeamName: string | null,
): ScoreboardFormFill | null {
  const homeTeamId = resolveTeamId(teams, parsed.homeTeamName)
  const awayTeamId = resolveTeamId(teams, parsed.awayTeamName)

  if (!homeTeamId || !awayTeamId) return null

  let homeScore = parsed.homeScore
  let awayScore = parsed.awayScore

  const playerTeam = playerTeamName?.trim()
  if (playerTeam) {
    const playerOnBroadcastHome = teamNamesMatch(parsed.homeTeamName, playerTeam)
    const playerOnBroadcastAway = teamNamesMatch(parsed.awayTeamName, playerTeam)

    const playerScore = playerOnBroadcastHome
      ? parsed.homeScore
      : playerOnBroadcastAway
        ? parsed.awayScore
        : null
    const opponentScore = playerOnBroadcastHome
      ? parsed.awayScore
      : playerOnBroadcastAway
        ? parsed.homeScore
        : null

    if (playerScore !== null && opponentScore !== null) {
      const homeTeam = teams.find((t) => t.id === homeTeamId)
      const awayTeam = teams.find((t) => t.id === awayTeamId)

      if (homeTeam && teamNamesMatch(homeTeam.name, playerTeam)) {
        homeScore = playerScore
        awayScore = opponentScore
      } else if (awayTeam && teamNamesMatch(awayTeam.name, playerTeam)) {
        homeScore = opponentScore
        awayScore = playerScore
      }
    }
  }

  return { homeTeamId, awayTeamId, homeScore, awayScore }
}

export function parseScoreboardFromOcr(
  text: string,
  teams: TeamOption[],
): ParsedScoreboard | null {
  const cleaned = cleanupOcrText(text)
  if (!cleaned) return null

  const scores = extractScorePair(cleaned)
  const teamHits = findTeamsInOcrText(cleaned, teams)

  if (!scores || teamHits.length < 2) return null

  const [firstTeam, secondTeam] = teamHits

  return {
    homeTeamName: firstTeam.team.name,
    homeScore: scores.first,
    awayScore: scores.second,
    awayTeamName: secondTeam.team.name,
  }
}

/** Parse OCR text and produce form values, or null if parsing fails. */
export function parseScoreboardForForm(
  rawText: string,
  teams: TeamOption[],
  playerTeamName: string | null,
): ScoreboardFormFill | null {
  const parsed = parseScoreboardFromOcr(rawText, teams)
  if (!parsed) return null
  return applyScoreboardToForm(parsed, teams, playerTeamName)
}
