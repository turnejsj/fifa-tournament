import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { getAllPlayerProfiles } from "@/lib/player-profiles"

export async function GET() {
  try {
    const players = await getAllPlayerProfiles()
    const { userId } = await auth()
    const isAdmin = Boolean(userId && (await isClerkUserAdmin(userId)))
    return NextResponse.json({ players, isAdmin })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
