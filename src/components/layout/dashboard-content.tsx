import { ReactNode } from "react";
import { Header } from "@/components/layout/header";

export function DashboardContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden md:ml-[216px]">
      <Header />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto bg-surface-app p-5"
      >
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
