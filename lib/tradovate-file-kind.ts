export type TradovateFileKind = "performance" | "orders" | "unknown"

/** Route Tradovate exports by filename (case-insensitive). */
export function classifyTradovateFilename(fileName: string): TradovateFileKind {
  const n = fileName.toLowerCase()
  if (n.includes("performance")) return "performance"
  if (n.includes("orders") || n.includes("trades")) return "orders"
  return "unknown"
}
