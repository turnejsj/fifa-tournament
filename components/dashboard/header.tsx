"use client"

import { Filter, Calendar, ChevronDown, Bell } from "lucide-react"

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-3 py-3 md:px-6 md:py-4">
      <h1 className="text-base font-semibold text-card-foreground md:text-xl">Dashboard</h1>

      <div className="flex items-center gap-2 md:gap-3">
        <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          <span className="h-2 w-2 rounded-full bg-primary-foreground" />
        </button>

        <button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted md:flex">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </button>

        <button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted lg:flex">
          <Calendar className="h-4 w-4" />
          <span>Date range</span>
        </button>

        <button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted md:flex">
          <span>All Accounts</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
