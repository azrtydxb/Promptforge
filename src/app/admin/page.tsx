"use client";

import { useState } from "react";
import { UserManagement } from "@/components/admin/user-management";
import { AdminOverview } from "@/components/admin/admin-overview";
import { BackupRestore } from "@/components/admin/backup-restore";


type AdminTab = "overview" | "users" | "moderation" | "ai-settings" | "backup";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900">
          Admin
        </h1>
        <span className="flex items-center gap-1.5 rounded-full bg-success-surface px-3 py-1 text-[12px] font-[500] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
          All systems operational
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-line-200">
        <nav className="-mb-px flex gap-1">
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
              onClick={() => setActiveTab(tab.id)}
              className={[
                "px-4 py-2.5 text-[13px] font-[500] border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-accent-500 text-accent-700"
                  : "border-transparent text-ink-600 hover:text-ink-900 hover:border-line-200",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

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
