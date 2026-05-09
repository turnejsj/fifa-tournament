"use client"

import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type CopyGamerTagButtonProps = {
  gamerTag: string
}

export function CopyGamerTagButton({ gamerTag }: CopyGamerTagButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = gamerTag.trim()
    if (!text) {
      toast.error("Nothing to copy")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Gamer tag copied")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy — try selecting the text manually")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 border-border bg-[#090909] text-zinc-200 hover:bg-[#141414] hover:text-white"
      onClick={() => void handleCopy()}
      aria-label="Copy gamer tag"
    >
      {copied ? (
        <Check className="size-3.5 text-[#00F081]" />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span className="ml-1.5 text-xs">Copy</span>
    </Button>
  )
}
