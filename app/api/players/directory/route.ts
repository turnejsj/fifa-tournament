import { NextResponse } from "next/server"
import { getAllPlayerProfiles } from "@/lib/player-profiles"

export async function GET() {
  try {
    const players = await getAllPlayerProfiles()
    return NextResponse.json({ players })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
