"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export function AdminDangerZone() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resetLeagueTable() {
    setError(null)
    setResetting(true)
    try {
      const res = await fetch("/api/admin/matches/reset", { method: "POST" })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Reset failed")
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setResetting(false)
    }
  }

  return (
    <Card className="border-destructive/40 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">Danger zone</CardTitle>
        <CardDescription className="text-zinc-400">
          Destructive actions that affect the whole tournament.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              Reset league table
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-border bg-[#0a0a0a] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset league table?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                Are you sure you want to delete all match scores and reset the table? This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-border bg-transparent text-white hover:bg-zinc-900"
                disabled={resetting}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={resetting}
                onClick={(e) => {
                  e.preventDefault()
                  void resetLeagueTable()
                }}
              >
                {resetting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-3.5" />
                    Resetting…
                  </span>
                ) : (
                  "Yes, reset everything"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
