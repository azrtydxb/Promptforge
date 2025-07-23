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
    <header className="flex h-14 items-center gap-4 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 shadow-sm sticky top-0 z-40" role="banner">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden hover:scale-[1.02] transition-transform duration-200"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col shadow-2xl">
          <nav id="main-navigation" className="grid gap-2 text-lg font-medium" role="navigation" aria-label="Main navigation">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold text-dell-blue-600 hover:text-dell-blue-700 transition-colors duration-200"
            >
              <div className="p-1 rounded-md bg-dell-blue-100">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <span>PromptForge</span>
            </Link>
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-dell-gray-300 to-transparent" />
            
            <Link
              href="/dashboard"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-dell-gray-600 hover:text-dell-blue-600 hover:bg-dell-blue-50 transition-all duration-200"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/prompts"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-dell-gray-600 hover:text-dell-blue-600 hover:bg-dell-blue-50 transition-all duration-200"
            >
              <FileText className="h-5 w-5" aria-hidden="true" />
              Prompts
            </Link>
            <Link
              href="/favorites"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-dell-gray-600 hover:text-dell-blue-600 hover:bg-dell-blue-50 transition-all duration-200"
            >
              <Star className="h-5 w-5" aria-hidden="true" />
              Favorites
            </Link>
            <Link
              href="/tags"
              className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-dell-gray-600 hover:text-dell-blue-600 hover:bg-dell-blue-50 transition-all duration-200"
            >
              <Tag className="h-5 w-5" aria-hidden="true" />
              Tags
            </Link>
          </nav>
        </SheetContent>
      </Sheet>


      {/* Profile avatar moved to right corner */}
      <div className="flex items-center justify-end ml-auto gap-2">
        <ThemeToggle />
        <AuthUserButton />
      </div>
    </header>
  )
}