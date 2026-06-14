"use client";

import { useState } from "react";
import Link from "next/link";
import { UserManagement } from "@/components/admin/user-management";
import { AdminOverview } from "@/components/admin/admin-overview";
import { BackupRestore } from "@/components/admin/backup-restore";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle } from "@/components/layout/topbar";


type AdminTab = "overview" | "users" | "moderation" | "ai-settings" | "backup";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  return (
    <div className="space-y-6">
      {/* ── Topbar Portal ── */}
      <TopbarPortal>
        <TopbarTitle>Admin</TopbarTitle>
        <div className="flex items-center gap-6 ml-4">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "users", label: "Users" },
              { id: "moderation", label: "Moderation" },
              { id: "ai-settings", label: "AI settings" },
            ] as { id: AdminTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "border-b-2 border-accent-700 pb-1 text-[13.5px] font-[600] text-accent-700"
                  : "pb-1 text-[13.5px] font-[550] text-ink-400 hover:text-ink-700"
              }
            >
              {tab.label}
            </button>
          ))}
          <Link
            href="/admin/security"
            className="pb-1 text-[13.5px] font-[550] text-ink-400 hover:text-ink-700"
          >
            Security &amp; SSO
          </Link>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-success-surface px-2.5 py-1 text-[11px] font-[550] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          All systems operational
        </span>
      </TopbarPortal>

      {/* Tab content */}
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "users" && <UserManagement />}
      {activeTab === "moderation" && (
        <div className="flex items-center justify-center rounded-[11px] border border-line-200 bg-surface-card p-12 text-ink-400">
          <p className="text-[13px]">Moderation — coming soon</p>
        </div>
      )}
      {activeTab === "ai-settings" && (
        <div className="flex items-center justify-center rounded-[11px] border border-line-200 bg-surface-card p-12 text-ink-400">
          <p className="text-[13px]">AI settings — coming soon</p>
        </div>
      )}
      {activeTab === "backup" && <BackupRestore />}
    </div>
  );
}
