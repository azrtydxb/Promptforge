# Design: Promptforge "Structured Pro" Redesign

**Date:** 2026-06-13
**Status:** Approved (pending spec review)
**Source spec:** `design_handoff_promptforge_redesign/` (README.md + `.dc.html` mocks — visual reference only, do not ship)

## Summary

Full redesign of Promptforge from the current Dell-blue / Nunito / gradient-heavy UI to **"Structured Pro"** — a dark slate sidebar + light, table-forward, data-dense workspace in the spirit of Linear/Vercel, with an indigo brand identity. The redesign also introduces the product's **commercial model** (Free / Team / Business) and the backend it requires.

This is a **visual reskin of the existing app PLUS three new backend subsystems**: plan/billing, SSO-SAML/SCIM, and an audit log. External integrations are **mocked** in this effort (real Prisma schema + server-side gating, placeholder billing/SAML/SCIM), with a dedicated follow-up phase + tracking GitHub issue to make them real.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Scope | Everything end-to-end (reskin + plans/billing + SSO/SAML/SCIM + audit log) |
| Backend depth | Real Prisma schema + server-side gating; **mock** external integrations (billing/SAML/SCIM) with realistic placeholder actions |
| Delivery | Spec → plan → phased build, with review gates |
| Existing extra features | **Strict spec** — remove features not represented in the 16 mocks |
| Plan model | `Subscription` on **Team**; effective user plan = highest plan across their teams; no paid team = Free |
| Mocks | Tracked as explicit debt; Phase 10 + GitHub issue replaces them with real functionality |

## Existing-state baseline

- **Stack:** Next.js 15.5 (App Router, Turbopack), React 19, TypeScript 5.9, Tailwind v4.1, shadcn/Radix, lucide-react, Prisma 6.17 + PostgreSQL, Redis, NextAuth v4 (JWT, credentials), Jest + Playwright.
- **Already present (reskin targets):** dashboard, prompts list/detail/new, marketplace (`shared-prompts`), teams (overview/members/settings/activity/invite), admin (stats/users/moderation), tags, templates, sign-in/up, share/invite/preview modals, `Subscription`-free team model with `TeamMember` roles (OWNER/ADMIN/MEMBER/VIEWER).
- **Missing (new backend):** any plan/seat/billing concept; SSO/SAML; SCIM; a Business audit log surface (partially covered by `TeamActivity`).

## A. Design tokens (Tailwind v4)

Replace the Dell-blue/Nunito token set in `src/app/globals.css` + `tailwind.config.ts` with the Structured Pro palette using Tailwind v4 `@theme` + CSS variables. Screens consume **semantic classes** (`bg-surface-card`, `text-ink-600`, `text-accent-700`, `bg-rail-bg`) — no hardcoded hexes in components.

- **Accent (indigo):** 700 `#3F49B8`, 500 `#5E6AD2` (primary), 400 `#7C87E8`, 300 `#8B93E0`, 200 `#C2C8F0`, 150 `#DFE2F6`, 100 `#EEF0FB`, border `#DDE1F7`.
- **Ink/line/surface:** per README (ink 900–300, line 200/150/100, surface sunken/app/muted/card).
- **Rail:** bg `#1B1E25`, border `#282C35`, text `#9BA1AD`, dim `#6B7280`, active-bg `#5E6AD2`.
- **Semantic:** success `#3A9D6E`/`#E8F4EE`, warning `#D98C3F`/`#FBF2E6`, danger `#CD5B62`/`#F0D6D8`, business `#7A5CD0`/`#F1ECFB`/`#E4D9F7`, star `#F2B333`.
- **Type:** Inter (UI) + JetBrains Mono (content/IDs/URLs/kbd/tabular) via `next/font`; tabular-nums on numerics; heading letter-spacing per scale table in README.
- **Radius/shadow/spacing:** frame 14px, cards 10–11px, inputs/buttons 7–9px, pills full; restrained shadows (frame/modal/primary-button per README).
- **Avatar convention:** one `<Avatar>` — gradient `linear-gradient(135deg,#5E6AD2,#8B93E0)` white initials for current user; `#DFE2F6` bg / `#3F49B8` initials for others.

## B. App shell

- **Slate rail:** refactor `src/components/layout/sidebar*.tsx` → 216px `#1B1E25` rail. Logo header (54px, brand tile + wordmark), nav list with exact order **Dashboard, My Prompts, Favorites, Templates, Shared Prompts, Prompt Market, Teams, Tags, — divider — Admin**, active style `#5E6AD2`/white/550, live counts (tabular-nums), footer (avatar + name + plan label `Team · Admin` / `Business · Admin` / `Free plan`).
- **Free-user variant:** omits Shared Prompts, Teams, Admin; adds "Upgrade to Teams" gradient promo above footer; footer reads "Free plan".
- **Topbar:** restyle `header.tsx` → 54px white bar, title + contextual control (search/breadcrumb/tabs) + right-aligned primary button. New reusable **SegmentedControl** (e.g. 7d/30d/90d) and **SearchInput** (with ⌘K // hint chip) components.
- **Nav visibility + route guards** driven by effective plan + role (section D).

## C. Strict-spec feature removal

Remove (routes + components + their server actions/links, and prune nav): **Collections, Following/social feed, Badges & Reputation, Comments threads, standalone unified Search page, Drafts as a nav destination.**

**Keep** (the mocks show these): **ratings** (Market cards, Quick Preview, Prompt detail stat), the Admin **moderation queue** (screen 11) and its supporting models, **favorites**, **version history**, **drafts auto-save** (background behavior, just not a nav destination).

The implementation plan will enumerate the exact file list to delete vs keep; user vetoes specific items at the plan-review gate. Removal must also clean: sidebar links, route folders under `src/app`, dead server actions, and tests referencing removed features.

## D. Plan & gating (new backend; billing mocked)

- **Schema:** new `Subscription` model linked 1:1 to `Team`:
  - `plan` enum `TEAM | BUSINESS`, `seatsTotal`, `seatsUsed`, `billingCycle` (`MONTHLY|ANNUAL`), `unitPriceCents`, `renewsAt`, `status` (`ACTIVE|PAST_DUE|CANCELED`).
  - Teams without a `Subscription` are implicitly Free-equivalent (shouldn't exist in practice — a Team implies Team+ plan; an individual with no paid team is Free).
- **`getEffectivePlan(user): 'FREE'|'TEAM'|'BUSINESS'`** = highest plan across the user's team memberships. Single source of truth for nav, guards, and upsell.
- **Server-side gating helpers** (e.g. `requirePlan('TEAM')`): Shared Prompts, Teams, team folders, roles, seat management require **Team+**; SSO/SCIM/audit require **Business**. Gated route deep-linked by a Free user → render **upsell screen (05)** (blurred skeleton + upsell card), and that route is hidden from nav.
- **Plans & billing screen (09):** current-plan banner, **seat stepper** (− N +) → mocked `updateSeats` action that recomputes `seatsTotal`/projected price on `Subscription`; three plan cards; comparison table. Plan CTAs route to a mocked checkout/upgrade action.
- **Billing is mocked:** placeholder server actions mutate `Subscription` and return realistic projected pricing; **no Stripe**.

## E. SSO / SAML + SCIM + audit (new backend; integration mocked)

- **Schema:**
  - `SamlConnection` (per Team): `idpSsoUrl`, `idpEntityId`, `x509Cert` (PEM), `certExpiresAt`, `status` (`ACTIVE|DISABLED`), `lastSyncAt`, `requireSso` (bool), `scimEnabled` (bool), `defaultRole` (TeamRole). SP-side values (ACS/Reply URL, SP entity ID, metadata URL) derived from team slug + app base URL (constants/computed, read-only in UI).
  - `VerifiedDomain` (per Team): `domain`, `status` (`VERIFIED|PENDING_DNS`).
- **SSO screen (12):** status card, IdP details (read-only copyable fields), x.509 cert block with validity, access-policy toggles (require SSO / SCIM / default role), SP details rail, verified domains list. Reusable **Toggle** (36×20) and **CopyField** components. Gated to **Business**.
- **Mocked integrations:** "Test connection" → simulated SAML round-trip result; toggles persist policy to `SamlConnection`; **SCIM 2.0 endpoint stub** at `/api/scim/v2/*` returns realistic Users/Groups shapes (Bearer-token shaped) without a real IdP. "Disable" confirms then flips status.
- **Audit log (Business):** back the audit surface with the existing `TeamActivity` model (extend event types if needed); no new event bus.

## F. Modals & overlays

Restyle within the existing `dialog` + `modal-provider` system (no parallel system):
- **Quick Preview (13):** universal eye-button overlay — category badge, meta, scrollable mono content with `{{variable}}` chips, Copy text / Open full / Copy to my library. Esc/backdrop/✕ close; copy → toast.
- **Share dialog (15):** "Share with people" (email + permission + people list + anyone-with-link) **and** "Publish to Prompt Market" (toggle reveals category + live stats + public URL). Done persists both paths.
- **Invite member (14):** email chips (Enter commits), three role radio cards, add-to-folder dropdown, seat counter, disable/seat-warn when exhausted; consumes seats + adds pending-invite rows.

## G. `{{variable}}` rendering

Shared utility to render mono prompt content with highlighted `{{variables}}` as `#EEF0FB`/`#3F49B8` inline chips — used by Prompt detail, Quick Preview, and Share.

## H. Phasing (implementation order)

1. **Tokens + fonts + Avatar** — globals.css/tailwind, Inter + JetBrains Mono, Avatar convention.
2. **App shell** — slate rail + topbar + SegmentedControl/SearchInput/Toggle/CopyField primitives + nav gating scaffold.
3. **Strict-spec removals** — delete features per section C; prune nav/routes/actions/tests.
4. **Plan/Subscription schema + gating + upsell (05) + Plans & billing (09)** — `getEffectivePlan`, `requirePlan`, mocked billing.
5. **Screen reskins** — Dashboard (01), My Prompts (02), Prompt detail (03), Prompt Market (06), Templates (07), Tags (10), Shared Prompts team view (04), Sign-in (16).
6. **Teams admin (08) + Invite modal (14)**.
7. **Admin Overview (11)**.
8. **SSO/SAML (12) + SCIM stub + audit log** schema, screens, mocked actions.
9. **Quick Preview (13) + Share dialog (15)** polish + `{{variable}}` utility.
10. **Replace mocked integrations with real functionality** — real billing (Stripe), real SAML 2.0 IdP round-trip + metadata, real SCIM 2.0 provisioning, with security review. **Tracked by a dedicated GitHub issue** (created during this effort). This phase is explicitly out of scope for the initial build but the mock boundaries are designed to be swappable (server actions behind stable interfaces). **Tracking issue: [#98](https://github.com/azrtydxb/Promptforge/issues/98).**

## I. Testing

- Component tests (Jest + Testing Library) for restyled primitives + cards.
- Unit tests for `getEffectivePlan` and `requirePlan` guards (Free/Team/Business × Owner/Admin/Editor/Viewer).
- Playwright smoke: nav-by-plan, gated-route upsell, Quick Preview/Share/Invite modals, seat stepper.
- Chrome DevTools MCP visual validation per screen before marking done (per CLAUDE.md).
- Each phase ends green (typecheck + lint + tests) before the next begins.

## J. Risks / open items

- **Strict removals** may touch shared code (e.g. ratings depend on some marketplace plumbing also used by removed comments) — plan must verify no over-deletion; ratings/moderation/favorites stay.
- **Plan-on-Team** means a Free individual has no Team row; ensure `getEffectivePlan` handles zero memberships → FREE.
- **SCIM/SAML mocks** must use stable interfaces so Phase 10 swaps implementation, not call sites.
- Mocked billing prices are illustrative; Phase 10 reconciles with real billing.

## Out of scope

- Real payment processing, real IdP/SCIM provisioning (→ Phase 10 / GitHub issue).
- Shipping the `.dc.html` / `support.js` runtime (visual reference only).
- Net-new features beyond the 16 mocked screens.
