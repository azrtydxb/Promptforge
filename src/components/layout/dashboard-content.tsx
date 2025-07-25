"use client";

import { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";

export function DashboardContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn(
      "flex flex-col flex-1 overflow-hidden transition-all duration-300",
      isCollapsed ? "ml-[70px]" : "ml-[260px]"
    )}>
      <Header />
      <main id="main-content" className="flex-1 overflow-y-auto bg-[#fafbfe] p-6">
        <div className="max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}