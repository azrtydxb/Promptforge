"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Plan } from "@/lib/plan";
import { cn } from "@/lib/utils";

interface PlanCard {
  key: Plan;
  name: string;
  blurb: string;
  price: string;
  unit: string;
  featured?: boolean;
}

const PLAN_CARDS: PlanCard[] = [
  { key: "FREE", name: "Individual", blurb: "Everything for personal prompt work.", price: "$0", unit: "/ forever" },
  { key: "TEAM", name: "Team", blurb: "Private sharing, folders, roles & seats.", price: "$9", unit: "/ seat / mo", featured: true },
  { key: "BUSINESS", name: "Business", blurb: "SSO/SAML, SCIM provisioning & audit log.", price: "$18", unit: "/ seat / mo" },
];

type Cell = boolean | string;
const COMPARISON: Array<{ feature: string; cells: [Cell, Cell, Cell] }> = [
  { feature: "Prompts, folders, versions, favorites", cells: [true, true, true] },
  { feature: "Templates & Prompt Market", cells: [true, true, true] },
  { feature: "Shared Prompts (private)", cells: [false, true, true] },
  { feature: "Shared team folders", cells: [false, true, true] },
  { feature: "Roles & permissions", cells: [false, true, true] },
  { feature: "Team admin & seat management", cells: [false, true, true] },
  { feature: "SSO/SAML & audit logs", cells: [false, false, true] },
  { feature: "Support", cells: ["Community", "Email", "Priority"] },
];

function Cell({ value }: { value: Cell }) {
  if (value === true)
    return (
      <span className="flex justify-center">
        <Check className="h-4 w-4 text-success" />
      </span>
    );
  if (value === false)
    return (
      <span className="flex justify-center">
        <Minus className="h-3.5 w-3.5 text-ink-300" />
      </span>
    );
  return <span className="block text-center text-[12px] text-ink-600">{value}</span>;
}

export function PlansView({ currentPlan }: { currentPlan: Plan }) {
  const [seats, setSeats] = useState(12);

  const cta = (label: string) => () =>
    toast.success(`${label} — checkout is mocked in this build.`);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900">Plans &amp; billing</h1>
        <span className="rounded-full bg-success-surface px-2.5 py-1 text-[11px] font-[550] text-success">
          Billed annually · save 20%
        </span>
      </div>

      {/* Current plan banner (paid plans) */}
      {currentPlan !== "FREE" && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[11px] border border-line-200 bg-surface-card p-[18px]">
          <div>
            <p className="text-[13px] font-[600] text-ink-900">
              You&apos;re on the{" "}
              <span className="text-accent-700">
                {currentPlan === "BUSINESS" ? "Business" : "Team"} plan
              </span>
            </p>
            <p className="mt-0.5 text-[12px] text-ink-400">
              {seats} seats · renews monthly ·{" "}
              <span className="tabular-nums">
                ${seats * (currentPlan === "BUSINESS" ? 18 : 9)}/mo
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-[7px] border border-line-200">
              <button
                onClick={() => setSeats((s) => Math.max(1, s - 1))}
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
              onClick={cta("Seats updated")}
              className="rounded-[7px] bg-accent-500 px-3 py-2 text-[12.5px] font-[550] text-white hover:bg-[#4F5AC4]"
            >
              Update seats
            </button>
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
                "flex flex-col rounded-[11px] bg-surface-card p-5",
                p.featured
                  ? "border-[1.5px] border-accent-500 shadow-[0_12px_32px_-12px_rgba(94,106,210,0.35)]"
                  : "border border-line-200"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-[620] text-ink-900">{p.name}</h3>
                {p.featured && (
                  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-[550] text-accent-700">
                    {isCurrent ? "Your plan" : "Popular"}
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
                onClick={isCurrent ? undefined : cta(`Switched to ${p.name}`)}
                disabled={isCurrent}
                className={cn(
                  "mt-5 rounded-[8px] px-3 py-2 text-[12.5px] font-[550] transition-colors",
                  isCurrent
                    ? "cursor-default bg-surface-muted text-ink-400"
                    : p.featured
                      ? "bg-accent-500 text-white hover:bg-[#4F5AC4]"
                      : "bg-accent-100 text-accent-700 hover:bg-accent-150"
                )}
              >
                {isCurrent ? "Current plan" : p.key === "FREE" ? "Downgrade" : "Upgrade"}
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
              <th className="px-2 py-2.5 text-center font-[600]">Individual</th>
              <th className="px-2 py-2.5 text-center font-[600]">Team</th>
              <th className="px-[18px] py-2.5 text-center font-[600]">Business</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.feature} className="border-t border-line-100">
                <td className="px-[18px] py-2.5 text-[12.5px] text-ink-700">{row.feature}</td>
                <td className="px-2 py-2.5">
                  <Cell value={row.cells[0]} />
                </td>
                <td className="px-2 py-2.5">
                  <Cell value={row.cells[1]} />
                </td>
                <td className="px-[18px] py-2.5">
                  <Cell value={row.cells[2]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
