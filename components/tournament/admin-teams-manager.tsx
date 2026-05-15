"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Team } from "@/lib/tournament-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  teams: Team[]
}

export function AdminTeamsManager({ teams: initialTeams }: Props) {
  const router = useRouter()
  const [teams, setTeams] = useState(initialTeams)
  const [newTeamName, setNewTeamName] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function addTeam() {
    setError(null)
    const name = newTeamName.trim()
    if (!name) {
      setError("Enter a team name")
      return
    }
    setAdding(true)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const json = (await res.json()) as {
        error?: string
        team?: Team
      }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not add team")
        return
      }
      if (json.team) {
        setTeams((prev) => [...prev, json.team!].sort((a, b) => a.name.localeCompare(b.name)))
        setNewTeamName("")
      }
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setAdding(false)
    }
  }

  function startEdit(team: Team) {
    setEditingId(team.id)
    setEditName(team.name)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
  }

  async function saveEdit(teamId: string) {
    setError(null)
    const name = editName.trim()
    if (!name) {
      setError("Team name is required")
      return
    }
    setBusyId(teamId)
    try {
      const res = await fetch(`/api/admin/teams/${encodeURIComponent(teamId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const json = (await res.json()) as { error?: string; team?: Team }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not save team")
        return
      }
      const updated = json.team
      if (updated) {
        setTeams((prev) =>
          [...prev.map((t) => (t.id === teamId ? updated : t))].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        )
      }
      setEditingId(null)
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setBusyId(null)
    }
  }

  async function deleteTeam(team: Team) {
    if (
      !window.confirm(
        `Delete "${team.name}"? This cannot be undone if the team has no linked matches.`
      )
    ) {
      return
    }
    setError(null)
    setBusyId(team.id)
    try {
      const res = await fetch(`/api/admin/teams/${encodeURIComponent(team.id)}`, {
        method: "DELETE",
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not delete team")
        return
      }
      setTeams((prev) => prev.filter((t) => t.id !== team.id))
      if (editingId === team.id) cancelEdit()
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
        <CardTitle className="text-lg text-white">Team management</CardTitle>
        <CardDescription className="text-zinc-400">
          Add, rename, or remove teams used on the league table and score submission.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="new-team-name" className="text-xs font-medium text-zinc-400">
              Add new team
            </label>
            <Input
              id="new-team-name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name"
              className="border-input bg-[#090909]"
              disabled={adding}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addTeam()
              }}
            />
          </div>
          <Button
            type="button"
            className="shrink-0 bg-[#00F081] text-black hover:bg-[#00d874]"
            disabled={adding}
            onClick={() => void addTeam()}
          >
            {adding ? (
              <span className="flex items-center gap-2">
                <Spinner className="size-3.5" />
                Adding…
              </span>
            ) : (
              "Add team"
            )}
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {teams.length === 0 ? (
          <p className="text-sm text-zinc-500">No teams yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {teams.map((team) => {
              const editing = editingId === team.id
              const loading = busyId === team.id
              return (
                <li
                  key={team.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  {editing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-w-0 flex-1 border-input bg-[#090909]"
                      disabled={loading}
                      aria-label="Edit team name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEdit(team.id)
                        if (e.key === "Escape") cancelEdit()
                      }}
                    />
                  ) : (
                    <span className="font-medium text-white">{team.name}</span>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {editing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#00F081] text-black hover:bg-[#00d874]"
                          disabled={loading}
                          onClick={() => void saveEdit(team.id)}
                        >
                          {loading ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-border"
                          disabled={loading}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="border border-border bg-zinc-800 text-white hover:bg-zinc-700"
                          disabled={loading}
                          onClick={() => startEdit(team)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={loading}
                          onClick={() => void deleteTeam(team)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
