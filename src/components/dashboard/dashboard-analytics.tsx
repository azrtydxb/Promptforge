"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { MinimalErrorFallback } from "@/components/error-boundary/error-fallbacks";

interface DashboardData {
  totalPrompts: number;
  totalFolders: number;
  totalTags: number;
  totalVersions: number;
  promptsByMonth: Array<{ month: string; count: number }>;
  promptsByFolder: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
  recentActivity: Array<{ id: string; title: string; type: string; createdAt: string }>;
  promptGrowth: Array<{ date: string; prompts: number; cumulative: number }>;
  recentlyUsedPrompts?: Array<{
    id: string;
    title: string;
    description: string | null;
    lastUsedAt: Date | null;
    tags: Array<{ id: string; name: string }>;
    _count: { likes: number };
  }>;
  mostLikedPrompts?: Array<{ id: string; title: string; _count: { likes: number } }>;
  mostVersionedPrompts?: Array<{ id: string; title: string; _count: { versions: number } }>;
  mostFavoritedPrompts?: Array<{ id: string; title: string; _count: { favorites: number } }>;
}

interface DashboardAnalyticsProps {
  data: DashboardData;
}

// Structured Pro indigo donut palette.
const DONUT_COLORS = ["#5E6AD2", "#8B93E0", "#C2C8F0", "#DFE2F6", "#EEF0FB"];

function fmt(n: number) {
  return n.toLocaleString();
}

function Metric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <div className="flex-1 px-[18px] py-4">
      <div className="text-[10px] font-[600] uppercase tracking-[0.06em] text-ink-400">
        {label}
      </div>
      <div className="mt-1.5 text-[24px] font-[680] leading-none tracking-[-0.03em] tabular-nums text-ink-900">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-ink-400">{caption}</div>
    </div>
  );
}

export function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  const topPrompts = (data.recentlyUsedPrompts ?? []).slice(0, 6);
  const folderTotal = data.promptsByFolder.reduce((s, f) => s + f.count, 0) || 1;

  return (
    <div className="space-y-4">
      {/* Page heading + segmented range (visual) */}
      <div className="flex items-center justify-between">
        <h1 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900">Dashboard</h1>
        <div className="flex items-center rounded-[7px] border border-line-200 bg-surface-muted p-0.5">
          {["7d", "30d", "90d"].map((r, i) => (
            <span
              key={r}
              className={
                i === 1
                  ? "rounded-[5px] bg-surface-card px-2.5 py-1 text-[11.5px] font-[550] text-ink-900 shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
                  : "px-2.5 py-1 text-[11.5px] text-ink-400"
              }
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Unified KPI bar */}
      <div className="flex flex-wrap items-stretch divide-x divide-line-150 overflow-hidden rounded-[11px] border border-line-200 bg-surface-card">
        <Metric label="Total prompts" value={fmt(data.totalPrompts)} caption="Active prompt templates" />
        <Metric label="Folders" value={fmt(data.totalFolders)} caption="Organization structures" />
        <Metric label="Tags" value={fmt(data.totalTags)} caption="Unique categories" />
        <Metric label="Versions" value={fmt(data.totalVersions)} caption="Total revisions" />
        <div className="hidden min-w-[200px] flex-[1.4] flex-col justify-center px-[18px] py-4 lg:flex">
          <div className="text-[10px] font-[600] uppercase tracking-[0.06em] text-ink-400">
            Growth
          </div>
          <div className="mt-1 h-[44px]">
            <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.promptGrowth}>
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#5E6AD2"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </SectionErrorBoundary>
          </div>
        </div>
      </div>

      {/* Two-column: table + right rail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Top prompts table */}
        <div className="rounded-[11px] border border-line-200 bg-surface-card">
          <div className="flex items-center justify-between border-b border-line-150 px-[18px] py-3.5">
            <h2 className="text-[13px] font-[620] tracking-[-0.01em] text-ink-900">
              Top prompts this week
            </h2>
            <Link
              href="/prompts"
              className="flex items-center gap-1 text-[11.5px] font-[550] text-accent-700 hover:text-accent-500"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topPrompts.length === 0 ? (
            <div className="px-[18px] py-10 text-center text-[12.5px] text-ink-400">
              No prompt activity yet. Create a prompt to see it here.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400">
                  <th className="px-[18px] py-2 text-left font-[600]">Prompt</th>
                  <th className="px-2 py-2 text-left font-[600]">Tags</th>
                  <th className="px-2 py-2 text-right font-[600]">Likes</th>
                  <th className="px-[18px] py-2 text-right font-[600]">Updated</th>
                </tr>
              </thead>
              <tbody>
                {topPrompts.map((p) => (
                  <tr key={p.id} className="border-t border-line-100">
                    <td className="px-[18px] py-2.5">
                      <Link
                        href={`/prompts/${p.id}`}
                        className="text-[12.5px] font-[550] text-ink-900 hover:text-accent-700"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-1">
                        {p.tags.slice(0, 2).map((t) => (
                          <span
                            key={t.id}
                            className="rounded-full bg-[#F1F2F5] px-2 py-0.5 text-[10px] font-[550] text-ink-600"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums text-ink-600">
                      {p._count.likes}
                    </td>
                    <td className="px-[18px] py-2.5 text-right text-[12px] tabular-nums text-ink-400">
                      {p.lastUsedAt
                        ? new Date(p.lastUsedAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* By folder donut */}
          <div className="rounded-[11px] border border-line-200 bg-surface-card p-[18px]">
            <h2 className="mb-3 text-[13px] font-[620] tracking-[-0.01em] text-ink-900">By folder</h2>
            {data.promptsByFolder.length === 0 ? (
              <p className="text-[12px] text-ink-400">No folders yet.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-[110px] w-[110px] flex-shrink-0">
                  <SectionErrorBoundary fallback={<MinimalErrorFallback />}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.promptsByFolder}
                          cx="50%"
                          cy="50%"
                          innerRadius={34}
                          outerRadius={52}
                          paddingAngle={2}
                          dataKey="count"
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {data.promptsByFolder.map((_, i) => (
                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </SectionErrorBoundary>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {data.promptsByFolder.slice(0, 5).map((f, i) => (
                    <li key={f.name} className="flex items-center gap-2 text-[11.5px]">
                      <span
                        className="h-2 w-2 rounded-[2px]"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="flex-1 truncate text-ink-600">{f.name}</span>
                      <span className="tabular-nums text-ink-400">
                        {Math.round((f.count / folderTotal) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-[11px] border border-line-200 bg-surface-card p-[18px]">
            <h2 className="mb-3 text-[13px] font-[620] tracking-[-0.01em] text-ink-900">
              Recent activity
            </h2>
            {data.recentActivity.length === 0 ? (
              <p className="text-[12px] text-ink-400">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {data.recentActivity.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-500" />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-[500] text-ink-700">{a.title}</p>
                      <p className="text-[11px] text-ink-400">
                        {a.type} · {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
