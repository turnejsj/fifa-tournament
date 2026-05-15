"use client"

import { useCallback, useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

type TeamOption = { id: string; name: string }

type ProfileRow = {
  id: string
  role?: string
  full_name: string | null
  tournament_team: string | null
  platform: string | null
  gamer_tag: string | null
}

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-[#090909] px-3 text-sm text-zinc-100 shadow-sm focus:border-[#00F081] focus:outline-none focus:ring-1 focus:ring-[#00F081]/40"

function hasGamertag(profile: ProfileRow | null): boolean {
  return Boolean(profile?.gamer_tag?.trim())
}

function hasTournamentTeam(profile: ProfileRow | null): boolean {
  return Boolean(profile?.tournament_team?.trim())
}

function TournamentTeamSelect({
  id,
  teams,
  value,
  onChange,
  required,
}: {
  id: string
  teams: TeamOption[]
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  if (teams.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No teams available. Ask an admin to add teams in the dashboard.
      </p>
    )
  }

  return (
    <select
      id={id}
      name={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={SELECT_CLASS}
      required={required}
    >
      <option value="" disabled>
        Select your Team...
      </option>
      {teams.map((t) => (
        <option key={t.id} value={t.name}>
          {t.name}
        </option>
      ))}
    </select>
  )
}

export function PlayerTournamentDetailsForm() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [dataReady, setDataReady] = useState(false)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [fullName, setFullName] = useState("")
  const [platform, setPlatform] = useState("PlayStation")
  const [gamerTag, setGamerTag] = useState("")
  const [tournamentTeam, setTournamentTeam] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setFetchError(null)
    setDataReady(false)
    const clerkFirst = user?.firstName?.trim() ?? ""
    try {
      const res = await fetch("/api/profile/me", { method: "GET" })
      const json = (await res.json()) as {
        profile?: ProfileRow | null
        teams?: TeamOption[]
        error?: string
      }
      if (!res.ok) {
        setFetchError(json.error ?? "Could not load profile")
        setProfile(null)
        setTeams([])
        setDataReady(true)
        return
      }

      const p = json.profile ?? null
      const t = Array.isArray(json.teams) ? json.teams : []
      setProfile(p)
      setTeams(t)

      if (p?.platform && ["PlayStation", "Xbox", "EA App"].includes(p.platform)) {
        setPlatform(p.platform)
      } else {
        setPlatform("PlayStation")
      }
      setGamerTag(p?.gamer_tag?.trim() ?? "")
      setFullName(p?.full_name?.trim() || clerkFirst)
      setTournamentTeam(p?.tournament_team?.trim() ?? "")

      setDataReady(true)
    } catch {
      setFetchError("Network error")
      setProfile(null)
      setTeams([])
      setDataReady(true)
    }
  }, [user?.id, user?.firstName])

  useEffect(() => {
    if (!isLoaded) return
    if (!user?.id) {
      setDataReady(true)
      setProfile(null)
      setTeams([])
      return
    }
    void load()
  }, [isLoaded, user?.id, load])

  async function handleSaveFullProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)

    if (!tournamentTeam.trim()) {
      setSaveError("Please select a tournament team")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          platform,
          gamer_tag: gamerTag.trim(),
          tournament_team: tournamentTeam.trim(),
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setSaveError(json.error ?? "Save failed")
        return
      }
      await load()
      router.refresh()
    } catch {
      setSaveError("Network error")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTeamOnly(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)

    if (!tournamentTeam.trim()) {
      setSaveError("Please select a tournament team")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournament_team: tournamentTeam.trim() }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setSaveError(json.error ?? "Save failed")
        return
      }
      await load()
      router.refresh()
    } catch {
      setSaveError("Network error")
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded) {
    return (
      <Card className="mb-8 border-border bg-card/80">
        <CardContent className="flex items-center gap-3 py-8">
          <Spinner className="size-5 text-[#00F081]" />
          <span className="text-sm text-zinc-400">Loading…</span>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return null
  }

  if (!dataReady) {
    return (
      <Card className="mb-8 border-border bg-card/80">
        <CardContent className="flex items-center gap-3 py-8">
          <Spinner className="size-5 text-[#00F081]" />
          <span className="text-sm text-zinc-400">Loading your profile…</span>
        </CardContent>
      </Card>
    )
  }

  if (fetchError) {
    return (
      <Card className="mb-8 border-destructive/40 bg-destructive/10">
        <CardContent className="py-4 text-sm text-destructive-foreground">{fetchError}</CardContent>
      </Card>
    )
  }

  const needsGamertag = !hasGamertag(profile)
  const needsTeam = !hasTournamentTeam(profile)

  if (!needsGamertag && !needsTeam) {
    return null
  }

  if (needsGamertag) {
    return (
      <Card className="mb-8 border-border bg-gradient-to-br from-[#0b0b0b] to-[#111112]">
        <CardHeader>
          <CardTitle className="text-white">Complete your tournament profile</CardTitle>
          <CardDescription className="text-zinc-400">
            Add your full name, platform, gamer tag, and team so others can find you in the player
            directory. Your name also appears as Manager on the league table for your tournament
            team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSaveFullProfile(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name as it should appear"
                className="border-input bg-[#090909]"
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <select
                id="platform"
                name="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className={SELECT_CLASS}
                required
              >
                <option value="PlayStation">PlayStation</option>
                <option value="Xbox">Xbox</option>
                <option value="EA App">EA App</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gamerTag">Gamer tag</Label>
              <Input
                id="gamerTag"
                name="gamerTag"
                value={gamerTag}
                onChange={(e) => setGamerTag(e.target.value)}
                placeholder="PSN ID, Xbox Gamertag, or EA ID"
                className="border-input bg-[#090909]"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tournamentTeam">Tournament team</Label>
              <TournamentTeamSelect
                id="tournamentTeam"
                teams={teams}
                value={tournamentTeam}
                onChange={setTournamentTeam}
                required
              />
            </div>

            {saveError ? (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={saving || teams.length === 0}
              className="w-full bg-[#00F081] text-black hover:bg-[#00d874] disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="size-4" />
                  Saving…
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-8 border-border bg-gradient-to-br from-[#0b0b0b] to-[#111112]">
      <CardHeader>
        <CardTitle className="text-white">Choose your tournament team</CardTitle>
        <CardDescription className="text-zinc-400">
          Pick one of the official teams so you appear on the league table and in the player
          directory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSaveTeamOnly(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tournamentTeamOnly">Tournament team</Label>
            <TournamentTeamSelect
              id="tournamentTeamOnly"
              teams={teams}
              value={tournamentTeam}
              onChange={setTournamentTeam}
              required
            />
          </div>

          {saveError ? (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={saving || teams.length === 0}
            className="w-full bg-[#00F081] text-black hover:bg-[#00d874] disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="size-4" />
                Saving…
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
