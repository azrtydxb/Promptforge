import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, Check } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { getPlanContext } from "@/lib/plan";
import { db } from "@/lib/db";
import { TeamRole } from "@/generated/prisma";

export const dynamic = "force-dynamic";

function canEdit(role: TeamRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export default async function SharedWithMePage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/sign-in");
  }

  const { plan } = await getPlanContext(user.id);

  // ── FREE plan gate ──────────────────────────────────────────────────────────
  if (plan === "FREE") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
        {/* Blurred skeleton cards behind the gate */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="grid w-full max-w-3xl grid-cols-3 gap-4 px-8 opacity-30 blur-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[11px] bg-surface-card border border-line-200 p-4 space-y-2"
              >
                <div className="h-4 w-3/4 rounded bg-surface-muted" />
                <div className="h-3 w-full rounded bg-surface-muted" />
                <div className="h-3 w-2/3 rounded bg-surface-muted" />
                <div className="mt-3 flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-accent-100" />
                  <div className="h-5 w-12 rounded-full bg-surface-muted" />
                </div>
              </div>
            ))}
          </div>
          {/* Gradient fade over the skeleton */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-app/60 to-surface-app" />
        </div>

        {/* Upsell card */}
        <div className="relative z-10 w-full max-w-[470px] rounded-[11px] border border-line-200 bg-surface-card p-8 shadow-sm">
          {/* Lock icon tile */}
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-accent-100">
            <Lock className="h-5 w-5 text-accent-700" />
          </div>

          <h1 className="mt-4 text-[21px] font-[660] tracking-[-0.02em] text-ink-900">
            Shared Prompts is a Teams feature
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            Every other feature in Promptforge is free, forever. Upgrade to a
            Teams plan to privately share prompts with teammates, organize team
            folders, and manage roles &amp; seats.
          </p>

          {/* Checklist */}
          <ul className="mt-5 space-y-2.5">
            {[
              "Private prompt sharing with teammates",
              "Shared team folders & libraries",
              "Roles, permissions & seat management",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success-surface">
                  <Check className="h-3 w-3 text-success" />
                </span>
                <span className="text-[13px] text-ink-700">{item}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/plans"
            className="mt-6 flex h-10 w-full items-center justify-center rounded-[7px] bg-accent-500 text-[13px] font-[550] text-white shadow-[0_1px_2px_rgba(94,106,210,0.35)] transition-colors hover:bg-[#4F5AC4]"
          >
            See Teams plans
          </Link>
          <p className="mt-3 text-center text-[12px] text-ink-400">
            Starts at $9 / seat / month
          </p>
        </div>
      </div>
    );
  }

  // ── TEAM / BUSINESS plan ────────────────────────────────────────────────────

  // Get user's team memberships to know which teams they belong to
  const memberships = await db.teamMember.findMany({
    where: { userId: user.id },
    select: { teamId: true, role: true },
  });

  const teamIds = memberships.map((m) => m.teamId);
  const roleByTeam = Object.fromEntries(
    memberships.map((m) => [m.teamId, m.role])
  );

  // Query team prompts for teams the user is a member of
  const teamPrompts = await db.teamPrompt.findMany({
    where: {
      teamId: { in: teamIds },
      isArchived: false,
    },
    include: {
      team: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalCount = teamPrompts.length;

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900">
          Shared Prompts
        </h1>
        {totalCount > 0 && (
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[12px] font-[550] text-ink-600">
            {totalCount}
          </span>
        )}
      </div>

      {/* Info banner */}
      <div className="rounded-[11px] border border-accent-200 bg-accent-100 px-4 py-3 text-[13px] text-ink-700">
        Prompts teammates shared with you directly. Looking for public prompts
        anyone can use?{" "}
        <Link
          href="/shared-prompts"
          className="font-[550] text-accent-700 hover:underline"
        >
          Browse the Prompt Market →
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search shared prompts…"
          className="h-9 w-full max-w-sm rounded-[7px] border border-line-200 bg-surface-muted px-3 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
      </div>

      {/* Empty state */}
      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[15px] font-[550] text-ink-700">
            Nothing shared with you yet
          </p>
          <p className="mt-1 text-[13px] text-ink-400">
            When teammates share prompts with your team, they&apos;ll appear
            here.
          </p>
        </div>
      ) : (
        /* Cards grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamPrompts.map((prompt) => {
            const role = roleByTeam[prompt.teamId] ?? "VIEWER";
            const accessLabel = canEdit(role as TeamRole) ? "Can edit" : "Can view";
            const accessColor =
              accessLabel === "Can edit"
                ? "bg-success-surface text-success"
                : "bg-surface-muted text-ink-600";

            const sharedDate = new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(prompt.createdAt));

            return (
              <div
                key={prompt.id}
                className="flex flex-col gap-3 rounded-[11px] border border-line-200 bg-surface-card p-4"
              >
                {/* Title */}
                <div>
                  <h3 className="truncate text-[14px] font-[600] text-ink-900">
                    {prompt.title}
                  </h3>
                  {prompt.description && (
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">
                      {prompt.description}
                    </p>
                  )}
                </div>

                {/* Access badge + meta */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-[550] ${accessColor}`}
                  >
                    {accessLabel}
                  </span>
                  {prompt.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-600"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                {/* Shared by */}
                <p className="text-[11.5px] text-ink-400">
                  Shared by {prompt.team.name} · {sharedDate}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 rounded-[7px] border border-line-200 bg-surface-muted py-1.5 text-[12px] font-[500] text-ink-700 hover:bg-surface-card transition-colors">
                    Preview
                  </button>
                  <button className="flex-1 rounded-[7px] bg-accent-500 py-1.5 text-[12px] font-[500] text-white hover:bg-[#4F5AC4] transition-colors">
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
