import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { isClerkUserAdmin } from '@/lib/is-clerk-admin'

const isSubmitScoreRoute = createRouteMatcher(['/submit-score(.*)'])
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

const clerk = clerkMiddleware(async (auth, req) => {
  if (isSubmitScoreRoute(req) || isAdminRoute(req)) {
    await auth.protect()
  }

  if (isAdminRoute(req)) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    const allowed = await isClerkUserAdmin(userId)
    if (!allowed) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
})

/** Next.js 16+ proxy convention (replaces `middleware.ts`). */
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerk(request, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
