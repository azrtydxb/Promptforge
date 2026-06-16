'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TeamRole } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'
import { resolveTxt } from 'dns/promises'
import { randomUUID } from 'crypto'

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

// Fix 10: Real HTTP connectivity check against the configured idpSsoUrl
export async function testSamlConnection(teamId: string): Promise<{ ok: boolean; message: string }> {
  await requireAuth()

  const saml = await db.samlConnection.findUnique({ where: { teamId } })
  if (!saml || !saml.idpSsoUrl) {
    return { ok: false, message: 'No SAML connection or IdP SSO URL configured.' }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    let response: Response
    try {
      response = await fetch(saml.idpSsoUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      })
    } finally {
      clearTimeout(timeoutId)
    }

    // Any 2xx or 3xx is treated as reachable
    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return { ok: true, message: `IdP reachable (HTTP ${response.status})` }
    }
    // 4xx from the IdP is still reachable — the endpoint exists
    if (response.status >= 400 && response.status < 500) {
      return { ok: true, message: `IdP reachable (HTTP ${response.status})` }
    }
    return { ok: false, message: `IdP returned HTTP ${response.status}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { ok: false, message: 'Connection timed out after 5 s' }
    }
    return { ok: false, message: `Unreachable: ${msg}` }
  }
}

export async function disableSaml(teamId: string) {
  await requireAuth()
  await db.samlConnection.updateMany({
    where: { teamId },
    data: { status: 'DISABLED' },
  })
  revalidatePath('/admin/security')
}

// Fix 11: Add a verified domain (status PENDING_DNS + verification token)
export async function addVerifiedDomain(
  teamId: string,
  domain: string
): Promise<{ success: boolean; error?: string; domain?: { id: string; domain: string; verificationToken: string } }> {
  await requireAuth()

  if (!domain || !domain.includes('.')) {
    return { success: false, error: 'Invalid domain name.' }
  }

  const normalised = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const verificationToken = `promptforge-verify=${randomUUID()}`

  try {
    const existing = await db.verifiedDomain.findUnique({
      where: { teamId_domain: { teamId, domain: normalised } },
    })
    if (existing) {
      return { success: false, error: 'Domain already added for this team.' }
    }

    const created = await db.verifiedDomain.create({
      data: {
        teamId,
        domain: normalised,
        status: 'PENDING_DNS',
        verificationToken,
      },
    })

    revalidatePath('/admin/security')
    return { success: true, domain: { id: created.id, domain: created.domain, verificationToken } }
  } catch (_err) {
    return { success: false, error: 'Failed to add domain.' }
  }
}

// Fix 11: Verify a domain via real DNS TXT lookup
export async function verifyDomain(
  domainId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth()

  const record = await db.verifiedDomain.findUnique({ where: { id: domainId } })
  if (!record) return { success: false, error: 'Domain record not found.' }
  if (record.status === 'VERIFIED') return { success: true }
  if (!record.verificationToken) {
    return { success: false, error: 'No verification token set for this domain.' }
  }

  try {
    const txtRecords = await resolveTxt(record.domain)
    const flat = txtRecords.flat()
    const matched = flat.some((txt) => txt === record.verificationToken)

    if (!matched) {
      return {
        success: false,
        error: `DNS TXT record not found. Add a TXT record: ${record.verificationToken}`,
      }
    }

    await db.verifiedDomain.update({
      where: { id: domainId },
      data: { status: 'VERIFIED' },
    })

    revalidatePath('/admin/security')
    return { success: true }
  } catch (_err) {
    return { success: false, error: 'DNS lookup failed. Please try again.' }
  }
}
