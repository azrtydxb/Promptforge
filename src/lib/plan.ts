import { db } from "@/lib/db";
import { TeamRole } from "@/generated/prisma";

/**
 * Effective commercial plan for a user. Until the Subscription model lands, plan is derived
 * from team membership: no paid team => FREE; member of any team => TEAM. BUSINESS arrives
 * with the Subscription/billing phase.
 */
export type Plan = "FREE" | "TEAM" | "BUSINESS";

export interface PlanContext {
  plan: Plan;
  /** Footer label, e.g. "Free plan" or "Team · Admin". */
  roleLabel: string;
}

const ROLE_RANK: Record<TeamRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

/** Map a TeamRole to the redesign's role vocabulary (MEMBER reads as "Editor"). */
const ROLE_DISPLAY: Record<TeamRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Editor",
  VIEWER: "Viewer",
};

/** Highest-ranked role across the given memberships, or null if none. */
export function highestRole(roles: TeamRole[]): TeamRole | null {
  if (roles.length === 0) return null;
  return roles.reduce((best, r) => (ROLE_RANK[r] > ROLE_RANK[best] ? r : best));
}

/** Build {plan, roleLabel} from a user's team memberships + the team's Subscription. */
export async function getPlanContext(userId: string): Promise<PlanContext> {
  const memberships = await db.teamMember.findMany({
    where: { userId },
    select: { role: true, team: { select: { subscription: { select: { plan: true } } } } },
  });

  if (memberships.length === 0) {
    return { plan: "FREE", roleLabel: "Free plan" };
  }

  const top = highestRole(memberships.map((m) => m.role)) as TeamRole;
  const hasBusiness = memberships.some((m) => m.team?.subscription?.plan === "BUSINESS");
  const plan: Plan = hasBusiness ? "BUSINESS" : "TEAM";
  const label = hasBusiness ? "Business" : "Team";
  return { plan, roleLabel: `${label} · ${ROLE_DISPLAY[top]}` };
}
