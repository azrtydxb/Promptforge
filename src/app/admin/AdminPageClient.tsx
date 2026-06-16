"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserManagement } from "@/components/admin/user-management";
import { AdminOverview } from "@/components/admin/admin-overview";
import { BackupRestore } from "@/components/admin/backup-restore";
import { ModerationDashboard } from "@/components/moderation/moderation-dashboard";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle } from "@/components/layout/topbar";
import { getPendingModeration, getModerationStats } from "@/app/actions/moderation.actions";
import { updateTeamAiSettings } from "@/app/actions/admin.actions";

type AdminTab = "overview" | "users" | "moderation" | "ai-settings" | "backup";

interface ModerationData {
  pending: SharedPrompt[];
  flagged: SharedPrompt[];
  recentLogs: ModerationLog[];
}

interface SharedPrompt {
  id: string;
  title: string;
  description: string | null;
  content: string;
  status: string;
  createdAt: Date;
  author: { id: string; name: string | null; username: string | null; image: string | null };
  prompt: { title: string; description: string | null };
}

interface ModerationLog {
  id: string;
  contentType: string;
  contentId: string;
  action: string;
  reason: string | null;
  automated: boolean;
  reviewedBy: string | null;
  createdAt: Date;
}

interface ModerationStatsData {
  pending: number;
  flagged: number;
  approved: number;
  rejected: number;
  todayActions: number;
  total: number;
}

interface AiSettings {
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  moderationEnabled?: boolean;
  autoTagging?: boolean;
}

interface AdminPageClientProps {
  systemHealthy: boolean;
  userRole: string;
  teamId: string | null;
  teamSettings: Record<string, unknown> | null;
  initialTab: string;
}

// ── AI Settings Panel ────────────────────────────────────────────────────────

function AiSettingsPanel({
  teamId,
  teamSettings,
}: {
  teamId: string | null;
  teamSettings: Record<string, unknown> | null;
}) {
  const settings = (teamSettings ?? {}) as AiSettings;
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel ?? "gpt-4o");
  const [temperature, setTemperature] = useState(String(settings.temperature ?? 0.7));
  const [maxTokens, setMaxTokens] = useState(String(settings.maxTokens ?? 2048));
  const [moderationEnabled, setModerationEnabled] = useState(settings.moderationEnabled ?? true);
  const [autoTagging, setAutoTagging] = useState(settings.autoTagging ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!teamId) {
      setError("No team found for your account.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await updateTeamAiSettings(teamId, {
        defaultModel,
        temperature: parseFloat(temperature),
        maxTokens: parseInt(maxTokens),
        moderationEnabled,
        autoTagging,
      });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error ?? "Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[11px] border border-line-200 bg-surface-card p-6 space-y-5">
        <h2 className="text-[14px] font-[600] text-ink-900">AI model settings</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-[600] uppercase tracking-[0.05em] text-ink-400">
              Default model
            </label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full rounded-md border border-line-200 bg-surface-card px-3 py-2 text-[13px] text-ink-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-[600] uppercase tracking-[0.05em] text-ink-400">
              Temperature <span className="normal-case font-[400]">(0–2)</span>
            </label>
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full rounded-md border border-line-200 bg-surface-card px-3 py-2 text-[13px] text-ink-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-[600] uppercase tracking-[0.05em] text-ink-400">
              Max tokens
            </label>
            <input
              type="number"
              min={256}
              max={128000}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              className="w-full rounded-md border border-line-200 bg-surface-card px-3 py-2 text-[13px] text-ink-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-line-150">
          <h3 className="text-[12px] font-[600] text-ink-700">Feature flags</h3>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-[13px] font-[500] text-ink-900">Content moderation</p>
              <p className="text-[12px] text-ink-400">Auto-flag prompts using AI moderation</p>
            </div>
            <input
              type="checkbox"
              checked={moderationEnabled}
              onChange={(e) => setModerationEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-accent-700"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-[13px] font-[500] text-ink-900">Auto-tagging</p>
              <p className="text-[12px] text-ink-400">Automatically generate tags for new prompts</p>
            </div>
            <input
              type="checkbox"
              checked={autoTagging}
              onChange={(e) => setAutoTagging(e.target.checked)}
              className="h-4 w-4 rounded accent-accent-700"
            />
          </label>
        </div>

        {error && <p className="text-[12px] text-danger">{error}</p>}

        <div className="flex items-center gap-3 pt-2 border-t border-line-150">
          <button
            onClick={handleSave}
            disabled={saving || !teamId}
            className="rounded-md bg-accent-700 px-4 py-2 text-[13px] font-[600] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && (
            <span className="text-[12px] text-success font-[500]">Saved!</span>
          )}
          {!teamId && (
            <span className="text-[12px] text-ink-400">No team found for your account.</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Moderation tab wrapper ───────────────────────────────────────────────────

function ModerationTabContent({ userRole }: { userRole: string }) {
  const [data, setData] = useState<ModerationData | null>(null);
  const [stats, setStats] = useState<ModerationStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [modResult, statsResult] = await Promise.allSettled([
          getPendingModeration(),
          getModerationStats(),
        ]);

        if (modResult.status === "fulfilled" && modResult.value.success) {
          setData(modResult.value.data as ModerationData ?? { pending: [], flagged: [], recentLogs: [] });
        } else {
          setData({ pending: [], flagged: [], recentLogs: [] });
        }
        if (statsResult.status === "fulfilled" && statsResult.value.success) {
          setStats(statsResult.value.stats ?? null);
        } else {
          setStats({ pending: 0, flagged: 0, approved: 0, rejected: 0, todayActions: 0, total: 0 });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-[11px] border border-line-200 bg-surface-card p-12">
        <p className="text-[13px] text-ink-400">Loading moderation queue…</p>
      </div>
    );
  }

  return (
    <ModerationDashboard
      initialData={data ?? { pending: [], flagged: [], recentLogs: [] }}
      initialStats={
        stats ?? {
          pending: 0, flagged: 0, approved: 0, rejected: 0, todayActions: 0, total: 0,
        }
      }
      userRole={userRole}
    />
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminPageClient({
  systemHealthy,
  userRole,
  teamId,
  teamSettings,
  initialTab,
}: AdminPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fix 7: derive active tab from ?tab= param
  const tabFromUrl = (searchParams.get("tab") ?? initialTab) as AdminTab;
  const [activeTab, setActiveTab] = useState<AdminTab>(
    ["overview", "users", "moderation", "ai-settings", "backup"].includes(tabFromUrl)
      ? (tabFromUrl as AdminTab)
      : "overview"
  );

  function navigateTab(tab: AdminTab) {
    setActiveTab(tab);
    router.push(`/admin?tab=${tab}`, { scroll: false });
  }

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
              onClick={() => navigateTab(tab.id)}
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
        {/* Fix 3: real system health pill */}
        <span
          className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[550] ${
            systemHealthy
              ? "bg-success-surface text-success"
              : "bg-danger-surface text-danger"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${systemHealthy ? "bg-success" : "bg-danger"}`}
          />
          {systemHealthy ? "All systems operational" : "System issue detected"}
        </span>
      </TopbarPortal>

      {/* Tab content */}
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "users" && <UserManagement />}
      {/* Fix 5: Real moderation dashboard */}
      {activeTab === "moderation" && <ModerationTabContent userRole={userRole} />}
      {/* Fix 6: Real AI settings panel */}
      {activeTab === "ai-settings" && (
        <AiSettingsPanel teamId={teamId} teamSettings={teamSettings} />
      )}
      {activeTab === "backup" && <BackupRestore />}
    </div>
  );
}
