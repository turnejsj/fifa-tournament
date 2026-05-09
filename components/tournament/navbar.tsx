"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

const navLinkClass =
  "flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm font-medium text-zinc-200 hover:bg-zinc-800/80 hover:text-white"

export function TournamentNavbar() {
  const { user, isLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const navLinks = (
    <>
      <SheetClose asChild>
        <Link href="/" className={navLinkClass}>
          League Table
        </Link>
      </SheetClose>
      <SheetClose asChild>
        <Link href="/submit-score" className={navLinkClass}>
          Submit Score
        </Link>
      </SheetClose>
      <SheetClose asChild>
        <Link href="/players" className={navLinkClass}>
          Find Players
        </Link>
      </SheetClose>
      {isAdmin && (
        <SheetClose asChild>
          <Link href="/admin" className={navLinkClass}>
            Dashboard
          </Link>
        </SheetClose>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-[#060606]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl min-w-0 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
        <Link
          href="/"
          className="min-w-0 shrink truncate text-xs font-semibold tracking-wide text-zinc-100 sm:text-sm"
        >
          EA FC 25 Tournament
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 md:flex md:gap-2">
          <Button asChild variant="ghost" size="sm" className="text-zinc-200 hover:text-white">
            <Link href="/">League Table</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-zinc-200 hover:text-white">
            <Link href="/submit-score">Submit Score</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-zinc-200 hover:text-white">
            <Link href="/players">Find Players</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="text-zinc-200 hover:text-white">
              <Link href="/admin">Dashboard</Link>
            </Button>
          )}

          {!isSignedIn && (
            <SignInButton mode="modal">
              <Button
                size="sm"
                className="bg-[#00F081] text-black hover:bg-[#00d874] sm:text-sm"
              >
                Login with Google
              </Button>
            </SignInButton>
          )}
          {isSignedIn && <UserButton />}
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <Button size="sm" className="bg-[#00F081] px-2 text-xs text-black hover:bg-[#00d874]">
                Login
              </Button>
            </SignInButton>
          ) : (
            <UserButton />
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-zinc-200 hover:bg-zinc-800 hover:text-white"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" strokeWidth={2} />
            </Button>
            <SheetContent
              side="right"
              className="flex w-[min(100vw-1rem,20rem)] flex-col border-border bg-[#0a0a0a] text-zinc-100 sm:max-w-sm"
            >
              <SheetHeader className="border-b border-border text-left">
                <SheetTitle className="text-white">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-1 flex-col gap-1 py-4">{navLinks}</nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
