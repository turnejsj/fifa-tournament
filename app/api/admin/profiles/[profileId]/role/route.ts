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

  const role = (body as { role?: unknown }).role
  if (role !== "admin" && role !== "player") {
    return NextResponse.json({ error: "role must be admin or player" }, { status: 400 })
  }

  if (id === userId && role !== "admin") {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return NextResponse.json({ ok: true, role })
}
