"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { AdminProfileRow } from "@/lib/admin-profiles"
import { isProfileAdmin } from "@/lib/admin-profiles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  profiles: AdminProfileRow[]
  currentUserId: string
}

function displayName(profile: AdminProfileRow): string {
  const name = profile.full_name?.trim()
  if (name) return name
  const email = profile.email?.trim()
  if (email) return email
  return profile.id
}

export function AdminManageAdmins({ profiles: initialProfiles, currentUserId }: Props) {
  const router = useRouter()
  const [profiles, setProfiles] = useState(initialProfiles)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleRole(profile: AdminProfileRow) {
    setError(null)
    const nextRole = isProfileAdmin(profile.role) ? "player" : "admin"
    setBusyId(profile.id)
    try {
      const res = await fetch(
        `/api/admin/profiles/${encodeURIComponent(profile.id)}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: nextRole }),
        }
      )
      const json = (await res.json()) as { error?: string; role?: string }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Update failed")
        return
      }
      const role = typeof json.role === "string" ? json.role : nextRole
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, role } : p))
      )
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg text-white">Manage admins</CardTitle>
        <CardDescription className="text-zinc-400">
          Grant or revoke admin access for registered users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {profiles.length === 0 ? (
          <p className="text-sm text-zinc-500">No profiles found.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {profiles.map((profile) => {
              const admin = isProfileAdmin(profile.role)
              const isSelf = profile.id === currentUserId
              const loading = busyId === profile.id
              return (
                <li
                  key={profile.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{displayName(profile)}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {profile.email?.trim() || profile.id}
                      <span className="mx-1.5 text-zinc-700">·</span>
                      <span className="capitalize text-zinc-400">
                        {admin ? "admin" : profile.role === "user" ? "player" : profile.role}
                      </span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={admin ? "outline" : "secondary"}
                    className={
                      admin
                        ? "shrink-0 border-border text-zinc-300 hover:bg-zinc-800"
                        : "shrink-0 bg-[#00F081] text-black hover:bg-[#00d874]"
                    }
                    disabled={loading || (isSelf && admin)}
                    onClick={() => void toggleRole(profile)}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="size-3.5" />
                        Saving…
                      </span>
                    ) : admin ? (
                      "Remove Admin"
                    ) : (
                      "Make Admin"
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
