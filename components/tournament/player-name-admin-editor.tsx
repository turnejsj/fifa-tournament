"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  profileId: string
  initialName: string | null
  onSaved?: (fullName: string) => void
}

export function PlayerNameAdminEditor({ profileId, initialName, onSaved }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(() => (initialName?.trim() ?? "").trim())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setValue((initialName?.trim() ?? "").trim())
  }, [profileId, initialName])

  async function save() {
    setErr(null)
    const name = value.trim()
    if (!name) {
      setErr("Name is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        `/api/admin/profiles/${encodeURIComponent(profileId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: name }),
        }
      )
      const json = (await res.json()) as { error?: string; full_name?: string }
      if (!res.ok) {
        setErr(typeof json.error === "string" ? json.error : "Save failed")
        return
      }
      const saved = typeof json.full_name === "string" ? json.full_name : name
      onSaved?.(saved)
      router.refresh()
    } catch {
      setErr("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Full name"
        className="min-w-0 border-input bg-[#090909] sm:max-w-[220px]"
        disabled={saving}
        aria-label="Edit player full name"
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0 border border-border bg-zinc-800 text-white hover:bg-zinc-700"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-3.5" />
            Saving…
          </span>
        ) : (
          "Save"
        )}
      </Button>
      {err ? (
        <span className="text-xs text-destructive" role="alert">
          {err}
        </span>
      ) : null}
    </div>
  )
}
