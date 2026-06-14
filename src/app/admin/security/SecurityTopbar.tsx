'use client'

import Link from 'next/link'
import { TopbarPortal } from '@/components/layout/topbar-portal'
import { TopbarTitle } from '@/components/layout/topbar'

export function SecurityTopbar() {
  return (
    <TopbarPortal>
      <TopbarTitle>Admin</TopbarTitle>
      <div className="flex items-center gap-6 ml-4">
        <Link
          href="/admin"
          className="pb-1 text-[13.5px] font-[550] text-ink-400 hover:text-ink-700"
        >
          Overview
        </Link>
        <Link
          href="/admin"
          className="pb-1 text-[13.5px] font-[550] text-ink-400 hover:text-ink-700"
        >
          Members
        </Link>
        <span className="border-b-2 border-accent-700 pb-1 text-[13.5px] font-[600] text-accent-700">
          Security &amp; SSO
        </span>
        <a
          href="#audit-log"
          className="pb-1 text-[13.5px] font-[550] text-ink-400 hover:text-ink-700"
        >
          Audit log
        </a>
      </div>
      <span className="ml-auto rounded-full bg-business-surface border border-business-border px-2 py-0.5 text-[11px] font-[550] text-business">
        Business plan
      </span>
    </TopbarPortal>
  )
}
