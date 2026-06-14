'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TeamRole } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'

export async function updateSamlPolicy(
  teamId: string,
  data: { requireSso?: boolean; scimEnabled?: boolean; defaultRole?: TeamRole }
) {
  await requireAuth()
  await db.samlConnection.updateMany({
    where: { teamId },
    data,
  })
  revalidatePath('/admin/security')
}

export async function testSamlConnection(_teamId: string): Promise<{ ok: boolean; message: string }> {
  // Mocked — no real SAML round-trip at this stage
  return { ok: true, message: 'SAML round-trip succeeded (mock)' }
}

export async function disableSaml(teamId: string) {
  await requireAuth()
  await db.samlConnection.updateMany({
    where: { teamId },
    data: { status: 'DISABLED' },
  })
  revalidatePath('/admin/security')
}
