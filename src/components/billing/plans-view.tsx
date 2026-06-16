"use client";

import { useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import type { Plan } from "@/lib/plan";
import type { PlanTier } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { updateSeats, changePlan } from "@/app/actions/billing.actions";
import { toast } from "sonner";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle } from "@/components/layout/topbar";

interface SubscriptionInfo {
  plan?: PlanTier;
  seatsTotal?: number;
  seatsUsed?: number;
  unitPriceCents?: number;
  renewsAt?: Date | null;
  teamId?: string;
  teamName?: string;
}

interface PlansViewProps {
  currentPlan: Plan;
  subscription?: SubscriptionInfo;
}

interface PlanCard {
  key: Plan;
  name: string;
  blurb: string;
  price: string;
  unit: string;
  cta: string;
  featured?: boolean;
}

const PLAN_CARDS: PlanCard[] = [
  {
    key: "FREE",
    name: "Free",
    blurb: "Everything for personal prompt work.",
    price: "$0",
    unit: "/ mo",
    cta: "Get started free",
  },
  {
    key: "TEAM",
    name: "Team",
    blurb: "Private sharing, folders, roles & seats.",
    price: "$9",
    unit: "/ seat / mo",
    cta: "Get started",
    featured: false,
  },
  {
    key: "BUSINESS",
    name: "Business",
    blurb: "SSO/SAML, SCIM provisioning & audit log.",
    price: "$18",
    unit: "/ seat / mo",
    cta: "Upgrade to Business",
    featured: true,
  },
];

type Cell = boolean | string;
const COMPARISON: Array<{ feature: string; cells: [Cell, Cell, Cell] }> = [
  { feature: "Personal prompts & versions", cells: ["Unlimited", "Unlimited", "Unlimited"] },
  { feature: "Templates & Prompt Market", cells: [true, true, true] },
  { feature: "Quick preview & copy", cells: [true, true, true] },
  { feature: "Shared Prompts (private)", cells: [false, true, true] },
  { feature: "Shared team folders", cells: [false, true, true] },
  { feature: "Roles & permissions", cells: [false, true, true] },
  { feature: "Team admin & seat management", cells: [false, true, true] },
  { feature: "SSO / SAML & audit logs", cells: [false, false, true] },
  { feature: "Support", cells: ["Community", "Email", "Priority"] },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true)
    return (
      <span className="flex justify-center">
        <Check className="h-4 w-4 text-success" />
      </span>
    );
  if (value === false)
    return (
      <span className="flex justify-center">
        <X className="h-3.5 w-3.5 text-ink-300" />
      </span>
    );
  return <span className="block text-center text-[12px] text-ink-600">{value}</span>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function PlansView({ currentPlan, subscription }: PlansViewProps) {
  const [seats, setSeats] = useState(subscription?.seatsTotal ?? 1);
  const [updating, setUpdating] = useState(false);
  const [planChanging, setPlanChanging] = useState<string | null>(null);

  const minSeats = subscription?.seatsUsed ?? 1;
  const unitPrice = subscription?.unitPriceCents ?? 0;
  const monthlyTotal = ((seats * unitPrice) / 100).toFixed(0);

  const hasPaidSub =
    subscription?.plan && subscription.teamId;

  async function handleChangePlan(tier: Plan) {
    if (!subscription?.teamId) {
      // FREE users with no team subscription: redirect to teams to create/upgrade
      window.location.href = "/teams";
      return;
    }
    setPlanChanging(tier);
    try {
      // changePlan only accepts TEAM or BUSINESS — FREE has no paid subscription action
      if (tier === "FREE") return;
      await changePlan(subscription.teamId, tier as "TEAM" | "BUSINESS");
      toast.success(`Plan updated to ${tier === "TEAM" ? "Team" : "Business"}`);
      // Refresh the page to reflect the new plan
      window.location.reload();
    } catch {
      toast.error("Failed to change plan");
    } finally {
      setPlanChanging(null);
    }
  }

  async function handleUpdateSeats() {
    if (!subscription?.teamId) return;
    setUpdating(true);
    try {
      await updateSeats(subscription.teamId, seats);
      toast.success("Seats updated");
    } catch {
      toast.error("Failed to update seats");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Topbar Portal ── */}
      <TopbarPortal>
        <TopbarTitle>Plans &amp; billing</TopbarTitle>
        <div className="flex items-center gap-6 ml-4">
          <Link
            href="/teams"
            className="pb-1 text-[13.5px] font-[550] text-ink-400 hover:text-ink-700"
          >
            Teams
          </Link>
          <span className="border-b-2 border-accent-700 pb-1 text-[13.5px] font-[600] text-accent-700">
            Plans
          </span>
          <Link
            href={subscription?.teamId ? `/teams/${subscription.teamId}/members` : "/teams"}
            className="pb-1 text-[13.5px] font-[550] text-ink-400 hover:text-ink-700"
          >
            Members
          </Link>
        </div>
        <span className="ml-auto rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-[550] text-accent-700">
          Billed annually · save 20%
        </span>
      </TopbarPortal>

      {/* Current plan banner */}
      {hasPaidSub && (
        <div className="rounded-[11px] border border-line-200 bg-surface-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-[600] text-ink-900">
                {subscription.teamName ?? "Your team"} is on the{" "}
                <span className="text-accent-700">
                  {subscription.plan === "BUSINESS" ? "Business" : "Team"} plan
                </span>
              </p>
              <p className="mt-0.5 text-[12px] text-ink-400">
                <span className="tabular-nums">{subscription.seatsUsed}</span> of{" "}
                <span className="tabular-nums">{subscription.seatsTotal}</span> seats used
                {subscription.renewsAt && (
                  <> · renews {formatDate(subscription.renewsAt)}</>
                )}
                {" "}·{" "}
                <span className="tabular-nums">${monthlyTotal}/mo</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-[7px] border border-line-200">
                <button
                  onClick={() => setSeats((s) => Math.max(minSeats, s - 1))}
                  className="flex h-8 w-8 items-center justify-center text-ink-600 hover:bg-surface-muted"
                  aria-label="Remove seat"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-[13px] font-[550] tabular-nums text-ink-900">
                  {seats}
                </span>
                <button
                  onClick={() => setSeats((s) => s + 1)}
                  className="flex h-8 w-8 items-center justify-center text-ink-600 hover:bg-surface-muted"
                  aria-label="Add seat"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={handleUpdateSeats}
                disabled={updating}
                className="rounded-[8px] bg-accent-500 px-3 py-2 text-[12.5px] font-[550] text-white hover:bg-[#4F5AC4] disabled:opacity-60"
              >
                {updating ? "Updating…" : "Update seats"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_CARDS.map((p) => {
          const isCurrent = p.key === currentPlan;
          return (
            <div
              key={p.key}
              className={cn(
                "flex flex-col rounded-[11px] bg-surface-card p-6",
                p.featured
                  ? "border-[1.5px] border-accent-500 shadow-[0_12px_32px_-12px_rgba(94,106,210,0.35)]"
                  : "border border-line-200"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-[620] text-ink-900">{p.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-[550] text-accent-700">
                    Your plan
                  </span>
                )}
                {!isCurrent && p.featured && (
                  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-[550] text-accent-700">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-ink-600">{p.blurb}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-[30px] font-[700] tracking-[-0.03em] tabular-nums text-ink-900">
                  {p.price}
                </span>
                <span className="text-[12px] text-ink-400">{p.unit}</span>
              </div>
              <button
                disabled={isCurrent || planChanging === p.key || p.key === "FREE"}
                onClick={() => !isCurrent && p.key !== "FREE" ? handleChangePlan(p.key) : undefined}
                className={cn(
                  "mt-5 rounded-[8px] px-3 py-2 text-[12.5px] font-[550] transition-colors",
                  isCurrent || p.key === "FREE"
                    ? "cursor-default bg-surface-muted text-ink-400"
                    : p.featured
                      ? "bg-accent-500 text-white hover:bg-[#4F5AC4] disabled:opacity-60"
                      : "bg-accent-100 text-accent-700 hover:bg-accent-150 disabled:opacity-60"
                )}
              >
                {isCurrent
                  ? "Current plan"
                  : planChanging === p.key
                    ? "Updating…"
                    : p.key === "FREE"
                      ? "Free forever"
                      : p.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="overflow-hidden rounded-[11px] border border-line-200 bg-surface-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line-150 text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400">
              <th className="px-[18px] py-2.5 text-left font-[600]">Feature</th>
              <th className="px-2 py-2.5 text-center font-[600]">Free</th>
              <th className="px-2 py-2.5 text-center font-[600]">Team</th>
              <th className="px-[18px] py-2.5 text-center font-[600]">Business</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row, i) => (
              <tr
                key={row.feature}
                className={cn(
                  "border-t border-line-100",
                  i % 2 === 0 ? "bg-surface-muted" : ""
                )}
              >
                <td className="px-[18px] py-2.5 text-[12.5px] text-ink-700">{row.feature}</td>
                <td className="px-2 py-2.5">
                  <CellValue value={row.cells[0]} />
                </td>
                <td className="px-2 py-2.5">
                  <CellValue value={row.cells[1]} />
                </td>
                <td className="px-[18px] py-2.5">
                  <CellValue value={row.cells[2]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
