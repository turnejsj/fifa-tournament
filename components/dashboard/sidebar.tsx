"use client"

import { ChangeEvent, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Settings,
  Users,
  Bell,
  FileText,
  HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { parseTradesCsv, Trade } from "@/lib/trades"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Calendar, label: "Calendar", href: "/analytics" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Users, label: "Accounts", href: "/accounts" },
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Settings" },
  { icon: HelpCircle, label: "Help" },
]

interface SidebarProps {
  onImportTrades?: (trades: Trade[]) => void
}

export function Sidebar({ onImportTrades }: SidebarProps) {
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportTradesClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      const parsedTrades = parseTradesCsv(text)
      onImportTrades?.(parsedTrades)
    }
    reader.readAsText(file)

    // Reset the input so selecting the same file again still triggers change.
    event.target.value = ""
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-sidebar p-4 md:flex">
        <div className="mb-6 flex h-11 items-center rounded-lg bg-primary px-4">
          <span className="text-lg font-bold text-primary-foreground">TitanLog</span>
        </div>

        <button
          type="button"
          onClick={handleImportTradesClick}
          className="mb-6 w-full rounded-lg bg-primary px-4 py-4 text-left text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Import Trades
        </button>

        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href ?? "#"}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-lg px-3 transition-colors",
                pathname === (item.href ?? "")
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-card-foreground">TitanLog</span>
          <button
            type="button"
            onClick={handleImportTradesClick}
            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Import
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-2 pb-2">
          {navItems
            .filter((item) => item.href)
            .map((item, index) => (
              <Link
                key={index}
                href={item.href ?? "#"}
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1 text-xs transition-colors",
                  pathname === (item.href ?? "")
                    ? "border-primary/40 bg-sidebar-accent text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
        </nav>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  )
}
