import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { createServiceSupabaseClient } from "@/lib/tournament-store"

type RouteContext = {
  params: Promise<{
    matchId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!(await isClerkUserAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { matchId } = await context.params
  const formData = await request.formData()
  const decision = String(formData.get("decision") ?? "")

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()
  const payload =
    decision === "approved"
      ? {
          status: "approved" as const,
          reviewed_by: userId,
          approved_at: now,
        }
      : {
          status: "rejected" as const,
          reviewed_by: userId,
          approved_at: null,
        }

  const result = await supabase.from("matches").update(payload).eq("id", matchId)

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return NextResponse.redirect(new URL("/admin", request.url))
}
