"use client";

import Link from "next/link"
import {
  FileText,
  Home,
  Menu,
  Tag,
  Zap,
  Star,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AuthUserButton } from "../auth/user-button"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function Header() {
  return (
    <header className="flex h-[var(--topbar-height)] items-center gap-4 border-b bg-white dark:bg-[hsl(var(--card))] px-6 shadow-sm sticky top-0 z-30" role="banner">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden text-foreground hover:text-[hsl(var(--primary))] transition-colors duration-200"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col shadow-2xl">
          <nav id="main-navigation" className="grid gap-2 text-lg font-medium" role="navigation" aria-label="Main navigation">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] transition-colors duration-200"
            >
              <div className="p-1 rounded-md bg-[hsl(var(--primary))]/20">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <span>PromptForge</span>
            </Link>
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-dell-gray-300 to-transparent" />
            
            <Link
              href="/dashboard"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--primary))]/10 transition-all duration-200"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/prompts"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--primary))]/10 transition-all duration-200"
            >
              <FileText className="h-5 w-5" aria-hidden="true" />
              Prompts
            </Link>
            <Link
              href="/favorites"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--primary))]/10 transition-all duration-200"
            >
              <Star className="h-5 w-5" aria-hidden="true" />
              Favorites
            </Link>
            <Link
              href="/tags"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--primary))]/10 transition-all duration-200"
            >
              <Tag className="h-5 w-5" aria-hidden="true" />
              Tags
            </Link>
          </nav>
        </SheetContent>
      </Sheet>


      {/* Right side items */}
      <div className="flex items-center justify-end ml-auto gap-3">
        <ThemeToggle />
        <AuthUserButton />
      </div>
    </header>
  )
}