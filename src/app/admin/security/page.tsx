import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPlanContext } from '@/lib/plan'
import { TeamRole } from '@/generated/prisma'
import { SecurityClient } from './SecurityClient'
import { SecurityTopbar } from './SecurityTopbar'
import { AddDomainForm } from './AddDomainForm'

export const dynamic = 'force-dynamic'

function formatDate(date: Date | null): string {
  if (!date) return 'never'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

export default async function SecurityPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  // Find the user's team where they have OWNER or ADMIN role
  const membership = await db.teamMember.findFirst({
    where: {
      userId: user.id,
      role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
    },
    include: {
      team: {
        include: {
          samlConnection: true,
          verifiedDomains: true,
          _count: { select: { members: true } },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              user: { select: { email: true, name: true } },
            },
          },
        },
      },
    },
  })

  const { plan } = await getPlanContext(user.id)

  // Upsell card for non-BUSINESS plans
  if (plan !== 'BUSINESS') {
    return (
      <div className="space-y-6">
        <SecurityTopbar />

        <div className="flex flex-col items-center justify-center gap-4 rounded-[11px] border border-line-200 bg-surface-card p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-business-surface">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-business">
              <path
                d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-[16px] font-[600] text-ink-900">SAML SSO &amp; Security controls</h2>
            <p className="mt-1 max-w-sm text-[13px] text-ink-400">
              Upgrade to Business to enable SAML 2.0 single sign-on, SCIM provisioning, domain
              verification, and advanced audit logs.
            </p>
          </div>
          <a
            href="/settings/billing"
            className="mt-2 rounded-md bg-accent-500 px-4 py-2 text-[13px] font-[600] text-white hover:opacity-90 transition-opacity"
          >
            Upgrade to Business
          </a>
        </div>
      </div>
    )
  }

  const team = membership?.team
  const saml = team?.samlConnection ?? null
  const domains = team?.verifiedDomains ?? []
  const activities = team?.activities ?? []
  const memberCount = team?._count?.members ?? 0

  return (
    <div className="space-y-6">
      <SecurityTopbar />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-4">
          {saml ? (
            <>
              {/* Status Card */}
              <div className="rounded-[11px] bg-rail-bg p-5">
                <div className="flex items-center gap-4">
                  {/* IdP logo tile */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink-900">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-[500] text-ink-400">{saml.providerName ?? 'SAML IdP'}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-[600] text-ink-900">{saml.providerName ?? 'SAML'} SAML 2.0</p>
                      {saml.status === 'ACTIVE' ? (
                        <span className="rounded-full bg-success-surface px-2 py-0.5 text-[10px] font-[600] text-success">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-[600] text-ink-400">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      Connected · last sync {formatDate(saml.lastSyncAt)} · {memberCount} members
                    </p>
                  </div>
                </div>
              </div>

              {/* IdP Details Card */}
              <div className="rounded-[11px] border border-line-200 bg-surface-card p-5">
                <h2 className="mb-4 text-[13px] font-[600] text-ink-900">IdP configuration</h2>
                <div className="space-y-3">
                  {saml.idpSsoUrl && (
                    <div>
                      <p className="mb-1 text-[11px] font-[500] uppercase tracking-wide text-ink-400">
                        IdP Sign-on URL
                      </p>
                      <div className="flex items-center rounded-md bg-surface-muted px-3 py-2">
                        <code className="flex-1 truncate font-mono text-[12px] text-ink-700">
                          {saml.idpSsoUrl}
                        </code>
                      </div>
                    </div>
                  )}
                  {saml.idpEntityId && (
                    <div>
                      <p className="mb-1 text-[11px] font-[500] uppercase tracking-wide text-ink-400">
                        IdP Entity ID
                      </p>
                      <div className="flex items-center rounded-md bg-surface-muted px-3 py-2">
                        <code className="flex-1 truncate font-mono text-[12px] text-ink-700">
                          {saml.idpEntityId}
                        </code>
                      </div>
                    </div>
                  )}
                  {saml.x509Cert && (
                    <div>
                      <p className="mb-1 text-[11px] font-[500] uppercase tracking-wide text-ink-400">
                        x.509 Certificate
                      </p>
                      <pre className="overflow-x-auto rounded-md bg-surface-muted p-3 font-mono text-[11px] text-ink-600 whitespace-pre-wrap break-all">
                        {saml.x509Cert}
                      </pre>
                      {saml.certExpiresAt && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-success">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Valid · expires {formatDate(saml.certExpiresAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive client section (policy toggles, test/disable, SP details) */}
              <SecurityClient saml={saml} teamSlug={team?.slug ?? 'your-team'} />
            </>
          ) : (
            /* No SAML connection configured */
            <div className="flex flex-col items-center justify-center gap-3 rounded-[11px] border border-line-200 bg-surface-card p-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-ink-400"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-[600] text-ink-900">No SAML connection configured</p>
                <p className="mt-1 text-[12px] text-ink-400">
                  Contact support to configure SAML SSO for your team.
                </p>
              </div>
            </div>
          )}

          {/* Audit Log Card */}
          <div id="audit-log" className="rounded-[11px] border border-line-200 bg-surface-card p-5">
            <h2 className="mb-4 text-[13px] font-[600] text-ink-900">Audit log</h2>
            {activities.length === 0 ? (
              <p className="text-[12px] text-ink-400">No activity yet.</p>
            ) : (
              <div className="space-y-0 divide-y divide-line-150">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-[500] text-ink-700">
                        {formatAction(activity.action)}
                        {activity.entityName ? (
                          <span className="text-ink-400"> · {activity.entityName}</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-ink-400">
                        {activity.user?.email ?? activity.user?.name ?? 'Unknown user'}
                      </p>
                    </div>
                    <time className="ml-4 shrink-0 text-[11px] text-ink-400">
                      {formatDate(activity.createdAt)}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Fix 11: Verified Domains with add + verify */}
          {team && (
            <AddDomainForm
              teamId={team.id}
              domains={domains}
            />
          )}

          {/* Business plan note */}
          <div className="rounded-[11px] border border-business-border bg-business-surface p-4">
            <p className="text-[12px] font-[500] text-business">
              SAML SSO, SCIM, and domain verification are Business plan features.
            </p>
            <a
              href="/settings/billing"
              className="mt-2 inline-block text-[12px] font-[600] text-business underline hover:no-underline"
            >
              Manage plan →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
