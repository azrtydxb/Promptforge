'use client'

import { useState, useTransition } from 'react'
import { Toggle } from '@/components/ui/toggle'
import { TeamRole } from '@/generated/prisma'
import { updateSamlPolicy, testSamlConnection, disableSaml } from '@/app/actions/saml.actions'

interface SamlConnectionData {
  id: string
  teamId: string
  idpSsoUrl: string | null
  idpEntityId: string | null
  x509Cert: string | null
  certExpiresAt: Date | null
  status: string
  lastSyncAt: Date | null
  requireSso: boolean
  scimEnabled: boolean
  defaultRole: TeamRole
}

interface SecurityClientProps {
  saml: SamlConnectionData
  teamSlug: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-2 shrink-0 rounded px-2 py-0.5 text-[11px] font-[500] text-ink-400 border border-line-200 hover:bg-surface-muted transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export function SecurityClient({ saml, teamSlug }: SecurityClientProps) {
  const [isPending, startTransition] = useTransition()
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [requireSso, setRequireSso] = useState(saml.requireSso)
  const [scimEnabled, setScimEnabled] = useState(saml.scimEnabled)
  const [defaultRole, setDefaultRole] = useState<TeamRole>(saml.defaultRole)

  const acsUrl = 'https://app.promptforge.com/sso/acs'
  const spEntityId = `promptforge-${teamSlug}`
  const metadataUrl = `https://app.promptforge.com/sso/metadata/${teamSlug}`

  function handleRequireSso(val: boolean) {
    setRequireSso(val)
    startTransition(async () => {
      await updateSamlPolicy(saml.teamId, { requireSso: val })
    })
  }

  function handleScimEnabled(val: boolean) {
    setScimEnabled(val)
    startTransition(async () => {
      await updateSamlPolicy(saml.teamId, { scimEnabled: val })
    })
  }

  function handleDefaultRole(val: TeamRole) {
    setDefaultRole(val)
    startTransition(async () => {
      await updateSamlPolicy(saml.teamId, { defaultRole: val })
    })
  }

  async function handleTestConnection() {
    const result = await testSamlConnection(saml.teamId)
    setTestResult(result)
    setTimeout(() => setTestResult(null), 5000)
  }

  async function handleDisable() {
    if (!confirm('Disable SAML SSO for this team? Members will revert to password login.')) return
    startTransition(async () => {
      await disableSaml(saml.teamId)
    })
  }

  return (
    <div className="space-y-4">
      {/* Access Policy Card */}
      <div className="rounded-[11px] border border-line-200 bg-surface-card p-5">
        <h2 className="mb-4 text-[13px] font-[600] text-ink-900">Access policy</h2>
        <div className="space-y-4">
          {/* Require SSO */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-[500] text-ink-900">Require SSO for all members</p>
              <p className="text-[12px] text-ink-400">Members must authenticate via SAML SSO</p>
            </div>
            <Toggle
              checked={requireSso}
              onChange={handleRequireSso}
              disabled={isPending}
            />
          </div>
          <div className="border-t border-line-150" />
          {/* SCIM */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-[500] text-ink-900">SCIM auto-provisioning</p>
              <p className="text-[12px] text-ink-400">Automatically provision and deprovision members</p>
            </div>
            <Toggle
              checked={scimEnabled}
              onChange={handleScimEnabled}
              disabled={isPending}
            />
          </div>
          <div className="border-t border-line-150" />
          {/* Default role */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-[500] text-ink-900">Default role for SSO users</p>
              <p className="text-[12px] text-ink-400">Role assigned to new members provisioned via SSO</p>
            </div>
            <select
              value={defaultRole}
              onChange={(e) => handleDefaultRole(e.target.value as TeamRole)}
              disabled={isPending}
              className="rounded-md border border-line-200 bg-surface-card px-3 py-1.5 text-[12px] font-[500] text-ink-700 focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
            >
              <option value="VIEWER">Viewer</option>
              <option value="MEMBER">Member (Editor)</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test / Disable actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTestConnection}
          className="rounded-md border border-line-200 bg-surface-card px-4 py-2 text-[13px] font-[500] text-ink-700 hover:bg-surface-muted transition-colors"
        >
          Test connection
        </button>
        <button
          onClick={handleDisable}
          disabled={isPending}
          className="rounded-md border border-danger bg-danger-surface px-4 py-2 text-[13px] font-[500] text-danger hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          Disable SAML
        </button>
        {testResult && (
          <span
            className={`text-[12px] font-[500] ${testResult.ok ? 'text-success' : 'text-danger'}`}
          >
            {testResult.ok ? '✓' : '✗'} {testResult.message}
          </span>
        )}
      </div>

      {/* SP Details (copyable) */}
      <div className="rounded-[11px] border border-line-200 bg-surface-card p-5">
        <h2 className="mb-4 text-[13px] font-[600] text-ink-900">Promptforge SP details</h2>
        <div className="space-y-3">
          {[
            { label: 'ACS URL', value: acsUrl },
            { label: 'SP Entity ID', value: spEntityId },
            { label: 'Metadata URL', value: metadataUrl },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="mb-1 text-[11px] font-[500] uppercase tracking-wide text-ink-400">
                {label}
              </p>
              <div className="flex items-center rounded-md bg-surface-muted px-3 py-2">
                <code className="flex-1 truncate font-mono text-[12px] text-ink-700">{value}</code>
                <CopyButton value={value} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
