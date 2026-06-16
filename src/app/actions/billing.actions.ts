'use server'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import type { PlanTier } from '@/generated/prisma'

/** Require the current user to be OWNER or ADMIN of the given team. */
async function requireTeamAdmin(teamId: string) {
  const user = await requireAuth()
  const membership = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
    select: { role: true },
  })
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    throw new Error('You do not have permission to manage this team’s billing')
  }
  return user
}

export async function updateSeats(teamId: string, seats: number) {
  await requireTeamAdmin(teamId)

  const sub = await db.subscription.findUnique({
    where: { teamId },
    select: { seatsUsed: true },
  })
  if (!sub) throw new Error('No subscription found for this team')
  if (!Number.isInteger(seats) || seats < 1) throw new Error('Seats must be a positive integer')
  if (seats < sub.seatsUsed) {
    throw new Error(`Cannot reduce seats below ${sub.seatsUsed} (seats currently in use)`)
  }

  await db.subscription.update({
    where: { teamId },
    data: { seatsTotal: seats },
  })
  revalidatePath('/plans')
  return { success: true }
}

const UNIT_PRICE_CENTS: Record<PlanTier, number> = {
  TEAM: 900,
  BUSINESS: 1800,
}

/**
 * Change a team's plan tier. No payment gateway is integrated, so this applies the
 * plan change directly (real DB mutation) — owner/admin only.
 */
export async function changePlan(teamId: string, plan: PlanTier) {
  await requireTeamAdmin(teamId)

  const existing = await db.subscription.findUnique({ where: { teamId } })
  const unitPriceCents = UNIT_PRICE_CENTS[plan]

  if (existing) {
    await db.subscription.update({
      where: { teamId },
      data: { plan, unitPriceCents },
    })
  } else {
    const memberCount = await db.teamMember.count({ where: { teamId } })
    await db.subscription.create({
      data: {
        teamId,
        plan,
        seatsTotal: Math.max(memberCount, 1),
        seatsUsed: memberCount,
        unitPriceCents,
        billingCycle: 'MONTHLY',
      },
    })
  }
  revalidatePath('/plans')
  return { success: true }
}
