/** Broadcast scoreboard: HOME TEAM SCORE - SCORE AWAY TEAM */
const SCOREBOARD_PATTERN = /([A-Za-z\s]+)\s+(\d+)\s*-\s*(\d+)\s+([A-Za-z\s]+)/

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

/** Uppercase and strip symbols so OCR text matches cleanly (e.g. MANCHESTER CITY). */
export function cleanupOcrText(text: string): string {
  return text
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9\s\-]/g, " ")
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

function parseMatch(match: RegExpMatchArray): ParsedScoreboard | null {
  const homeTeamName = match[1].trim()
  const homeScore = Number(match[2])
  const awayScore = Number(match[3])
  const awayTeamName = match[4].trim()

  if (!homeTeamName || !awayTeamName || !isValidScore(homeScore) || !isValidScore(awayScore)) {
    return null
  }

  return { homeTeamName, homeScore, awayScore, awayTeamName }
}

/**
 * Extract the top scoreboard string: [TEAM] [N] - [N] [TEAM].
 * Ignores other numbers in the OCR output.
 */
export function parseScoreboardFromOcr(text: string): ParsedScoreboard | null {
  const cleaned = cleanupOcrText(text)
  if (!cleaned) return null

  const match = cleaned.match(SCOREBOARD_PATTERN)
  if (match) return parseMatch(match)

  return null
}

function resolveTeamId(teams: TeamOption[], ocrTeamName: string): string | null {
  const exact = teams.find((t) => teamNamesMatch(ocrTeamName, t.name))
  return exact?.id ?? null
}

/**
 * Map broadcast groups to form fields. Team dropdowns follow TV order (group 1
 * home, group 4 away). Scores map to the player's side when their profile team
 * is known — flipped if they appear on the away side of the scoreboard string.
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

/** Parse OCR text and produce form values, or null if the scoreboard pattern is not found. */
export function parseScoreboardForForm(
  text: string,
  teams: TeamOption[],
  playerTeamName: string | null,
): ScoreboardFormFill | null {
  const parsed = parseScoreboardFromOcr(text)
  if (!parsed) return null
  return applyScoreboardToForm(parsed, teams, playerTeamName)
}
