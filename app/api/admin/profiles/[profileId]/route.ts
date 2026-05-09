import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

type RouteContext = {
  params: Promise<{ profileId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await auth()
  if (!userId || !(await isClerkUserAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { profileId } = await context.params
  const id = String(profileId).trim()
  if (!id) {
    return NextResponse.json({ error: "Invalid profile id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const fullName =
    typeof raw.full_name === "string" ? raw.full_name.trim() : ""

  if (!fullName) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/players")
  return NextResponse.json({ ok: true, full_name: fullName })
}
