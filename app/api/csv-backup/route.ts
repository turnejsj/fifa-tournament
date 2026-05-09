import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Store a raw Tradovate CSV in Vercel Blob (optional).
 * Set `BLOB_READ_WRITE_TOKEN` in the project; if unset, returns `{ skipped: true }`.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({
        skipped: true,
        message: "BLOB_READ_WRITE_TOKEN not set; backup skipped.",
      })
    }

    const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
    const pathname = `tradovate-csv/${Date.now()}-${safeBase}`

    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return NextResponse.json({ skipped: false, url: blob.url, pathname: blob.pathname })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
