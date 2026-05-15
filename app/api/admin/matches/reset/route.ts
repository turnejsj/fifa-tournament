import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

export async function POST() {
  const { userId } = await auth()
  if (!userId || !(await isClerkUserAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()

  const { error: matchesError } = await supabase
    .from("matches")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 })
  }

  const { error: profilesError } = await supabase
    .from("profiles")
    .update({ tournament_team: null, updated_at: now })
    .not("id", "is", null)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/players")
  revalidatePath("/submit-score")
  return NextResponse.json({ ok: true })
}
