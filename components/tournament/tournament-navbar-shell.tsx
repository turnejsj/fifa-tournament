import { auth } from "@clerk/nextjs/server"
import { isClerkUserAdmin } from "@/lib/is-clerk-admin"
import { TournamentNavbar } from "./navbar"

/**
 * Server wrapper: resolves Clerk session, then checks Supabase `profiles.role === 'admin'`
 * for the Dashboard link. Client navbar stays interactive (Clerk sign-in UI).
 */
export async function TournamentNavbarShell() {
  const { userId } = await auth()
  const showDashboard = Boolean(userId && (await isClerkUserAdmin(userId)))
  return <TournamentNavbar showDashboard={showDashboard} />
}
