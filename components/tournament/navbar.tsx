"use client"

import Link from "next/link"
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

type TournamentNavbarProps = {
  isAdmin?: boolean
}

export function TournamentNavbar({ isAdmin = false }: TournamentNavbarProps) {
  const { isSignedIn } = useAuth()

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
              <Link href="/admin">Admin</Link>
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
