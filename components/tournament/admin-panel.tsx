"use client"

import type { ReactNode } from "react"
import type { AdminProfileRow } from "@/lib/admin-profiles"
import type { Team } from "@/lib/tournament-store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminDangerZone } from "@/components/tournament/admin-danger-zone"
import { AdminManageAdmins } from "@/components/tournament/admin-manage-admins"
import { AdminTeamsManager } from "@/components/tournament/admin-teams-manager"

type Props = {
  currentUserId: string
  profiles: AdminProfileRow[]
  teams: Team[]
  disputedMatches: ReactNode
}

export function AdminPanel({ currentUserId, profiles, teams, disputedMatches }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="disputed" className="w-full gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-zinc-900/80 p-1 sm:w-auto">
          <TabsTrigger
            value="disputed"
            className="data-[state=active]:bg-[#00F081] data-[state=active]:text-black"
          >
            Disputed matches
          </TabsTrigger>
          <TabsTrigger
            value="admins"
            className="data-[state=active]:bg-[#00F081] data-[state=active]:text-black"
          >
            Manage admins
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            className="data-[state=active]:bg-[#00F081] data-[state=active]:text-black"
          >
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disputed" className="mt-0 space-y-4">
          {disputedMatches}
        </TabsContent>

        <TabsContent value="admins" className="mt-0">
          <AdminManageAdmins profiles={profiles} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="teams" className="mt-0">
          <AdminTeamsManager teams={teams} />
        </TabsContent>
      </Tabs>

      <AdminDangerZone />
    </div>
  )
}
