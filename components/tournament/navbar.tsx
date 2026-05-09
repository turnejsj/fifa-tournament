"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

export function TournamentNavbar() {
  const { user, isLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    const clerkId = user?.id
    if (!clerkId) {
      setIsAdmin(false)
      return
    }

    const idString = String(clerkId)
    console.log("[TournamentNavbar] Clerk user.id:", idString)

    const supabase = createBrowserSupabaseClient()
    if (!supabase) {
      console.warn("[TournamentNavbar] Supabase browser client unavailable (missing env)")
      setIsAdmin(false)
      return
    }

    let cancelled = false

    void supabase
      .from("profiles")
      .select("role")
      .eq("id", idString)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        const role = data?.role ?? null
        console.log("[TournamentNavbar] profiles role (fetched):", role, error ? error.message : null)
        setIsAdmin(role === "admin")
      })

    return () => {
      cancelled = true
    }
  }, [isLoaded, user?.id])

  const isSignedIn = Boolean(user)

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-[#060606]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-100">
          EA FC 25 Tournament
        </Link>

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="text-zinc-200 hover:text-white">
            <Link href="/">League Table</Link>
          </Button>
          <Button asChild variant="ghost" className="text-zinc-200 hover:text-white">
            <Link href="/submit-score">Submit Score</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" className="text-zinc-200 hover:text-white">
              <Link href="/admin">Dashboard</Link>
            </Button>
          )}

          {!isSignedIn && (
            <SignInButton mode="modal">
              <Button className="bg-[#00F081] text-black hover:bg-[#00d874]">
                Login with Google
              </Button>
            </SignInButton>
          )}
          {isSignedIn && (
            <UserButton />
          )}
        </nav>
      </div>
    </header>
  )
}
