/**
 * Strip `$` `,` `(` `)` and spaces from accounting-style P/L cells, then `parseFloat`.
 * Examples: `$(100.00)` → `-100`, `(50)` → `-50`, `$1,234.56` → `1234.56`
 */
export function stripAccountingPnlToNumber(raw: string): number | null {
  const t = String(raw ?? "").trim()
  if (!t) return null

  const withoutDollar = t.replace(/\$/g, "").replace(/\s/g, "")
  const neg =
    (withoutDollar.startsWith("(") && withoutDollar.endsWith(")")) ||
    (t.includes("(") && t.includes(")") && !t.trim().startsWith("-"))

  const cleaned = t.replace(/[$,()\s]/g, "")
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  return neg ? -Math.abs(n) : n
}
