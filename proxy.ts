import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/submit-score(.*)'])

const clerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
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
