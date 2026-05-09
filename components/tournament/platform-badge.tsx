import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PLATFORM_STYLES: Record<string, string> = {
  PSN: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  PlayStation: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  Xbox: "border-[#107C10]/50 bg-[#107C10]/15 text-[#6ae86a]",
  EA: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  "EA App": "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
}

export function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform?.trim()) {
    return <span className="text-sm text-zinc-500">—</span>
  }
  const key = platform.trim()
  const cls = PLATFORM_STYLES[key] ?? "border-border bg-muted/30 text-zinc-300"

  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {key}
    </Badge>
  )
}
