'use client'

import { useState } from 'react'
import { addVerifiedDomain, verifyDomain } from '@/app/actions/saml.actions'

interface DomainRecord {
  id: string
  domain: string
  status: string
  verificationToken?: string | null
}

interface AddDomainFormProps {
  teamId: string
  domains: DomainRecord[]
}

export function AddDomainForm({ teamId, domains: initialDomains }: AddDomainFormProps) {
  const [domains, setDomains] = useState<DomainRecord[]>(initialDomains)
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [verifyResults, setVerifyResults] = useState<Record<string, string>>({})

  async function handleAdd() {
    if (!newDomain.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const result = await addVerifiedDomain(teamId, newDomain.trim())
      if (result.success && result.domain) {
        setDomains((prev) => [
          ...prev,
          {
            id: result.domain!.id,
            domain: result.domain!.domain,
            status: 'PENDING_DNS',
            verificationToken: result.domain!.verificationToken,
          },
        ])
        setNewDomain('')
      } else {
        setAddError(result.error ?? 'Failed to add domain.')
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleVerify(domainId: string) {
    setVerifyingId(domainId)
    setVerifyResults((prev) => ({ ...prev, [domainId]: '' }))
    try {
      const result = await verifyDomain(domainId)
      if (result.success) {
        setDomains((prev) =>
          prev.map((d) => (d.id === domainId ? { ...d, status: 'VERIFIED' } : d))
        )
        setVerifyResults((prev) => ({ ...prev, [domainId]: 'Verified!' }))
      } else {
        setVerifyResults((prev) => ({ ...prev, [domainId]: result.error ?? 'Verification failed.' }))
      }
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <div className="rounded-[11px] border border-line-200 bg-surface-card p-5">
      <h2 className="mb-4 text-[13px] font-[600] text-ink-900">Verified domains</h2>

      {/* Existing domains */}
      {domains.length === 0 ? (
        <p className="text-[12px] text-ink-400 mb-4">No domains added yet.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {domains.map((d) => (
            <div key={d.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-[500] text-ink-700">{d.domain}</span>
                <div className="flex items-center gap-2">
                  {d.status === 'VERIFIED' ? (
                    <span className="rounded-full bg-success-surface px-2 py-0.5 text-[10px] font-[600] text-success">
                      Verified
                    </span>
                  ) : (
                    <>
                      <span className="rounded-full bg-warning-surface px-2 py-0.5 text-[10px] font-[600] text-warning">
                        Pending DNS
                      </span>
                      <button
                        onClick={() => handleVerify(d.id)}
                        disabled={verifyingId === d.id}
                        className="rounded px-2 py-0.5 text-[11px] font-[500] border border-line-200 text-ink-700 hover:bg-surface-muted transition-colors disabled:opacity-50"
                      >
                        {verifyingId === d.id ? 'Checking…' : 'Verify'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Show DNS instruction for pending domains */}
              {d.status !== 'VERIFIED' && d.verificationToken && (
                <p className="text-[11px] text-ink-400 font-mono bg-surface-muted rounded px-2 py-1 break-all">
                  Add TXT record: {d.verificationToken}
                </p>
              )}
              {verifyResults[d.id] && (
                <p
                  className={`text-[11px] ${verifyResults[d.id] === 'Verified!' ? 'text-success' : 'text-danger'}`}
                >
                  {verifyResults[d.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add domain input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="example.com"
          className="flex-1 rounded-md border border-line-200 bg-surface-muted px-3 py-1.5 text-[12px] text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newDomain.trim()}
          className="rounded-md bg-accent-700 px-3 py-1.5 text-[12px] font-[600] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {adding ? 'Adding…' : 'Add domain'}
        </button>
      </div>
      {addError && <p className="mt-1.5 text-[11px] text-danger">{addError}</p>}
    </div>
  )
}
