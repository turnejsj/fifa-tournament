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
  const { error } = await supabase
    .from("matches")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/submit-score")
  return NextResponse.json({ ok: true })
}
