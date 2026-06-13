# Phase 2 — App Shell (Slate Rail + Topbar) Plan

**Goal:** Replace the gradient dark sidebar + bordered topbar with the Structured Pro
"slate rail" (216px `#1B1E25`) and a clean 54px white topbar, driven by the user's
effective plan.

**Spec:** design spec §B. Reskins existing `sidebar*.tsx` + `header.tsx` — no parallel system.

## Decisions
- **Nav (this phase):** Dashboard, My Prompts (count), Favorites (count), Templates,
  Prompt Market (→ `/shared-prompts`), Teams, Tags, — divider — Admin. The separate
  **"Shared Prompts" (team direct-shares, screen 04)** is deferred to its feature phase
  (no route/backend yet; a dead/duplicate link is worse than deferring).
- **Plan:** `getPlanContext(userId)` → `{ plan: 'FREE'|'TEAM'|'BUSINESS', roleLabel }`.
  No Subscription model yet, so: FREE if zero team memberships, else TEAM. BUSINESS arrives
  with the Subscription phase. Footer label: FREE → "Free plan"; else `Team · <Role>`.
- **Plan gating (this phase, nav visibility only):** FREE users don't see **Teams** (and
  the deferred Shared Prompts). **Admin** stays gated by `user.role === ADMIN` (platform
  admin, independent of plan). Full route guards + upsell screen come in the gating phase.
- **Free-user variant:** adds an "Upgrade to Teams" promo above the footer.

## Files
- Create `src/lib/plan.ts` — `getPlanContext`, `PlanContext` type. Test `src/lib/__tests__/plan.test.ts`.
- Rewrite `src/components/layout/sidebar-client.tsx` — the rail (presentational, takes data props).
- Rewrite `src/components/layout/sidebar.tsx` — server: fetch user + counts + plan, pass to client.
- Restyle `src/components/layout/header.tsx` — 54px white topbar.

## Tasks

### Task 1: `getPlanContext` helper (TDD)
- Test: zero memberships → `{plan:'FREE', roleLabel:'Free plan'}`; with an OWNER membership →
  `{plan:'TEAM', roleLabel:'Team · Owner'}`; ADMIN team role → 'Team · Admin'; MEMBER → 'Team · Editor';
  VIEWER → 'Team · Viewer'. (Mapping MEMBER→Editor matches the redesign's role vocabulary.)
- Impl in `src/lib/plan.ts`: query `db.teamMember.findMany({ where:{userId} })`; plan = count>0?'TEAM':'FREE';
  pick the highest role (OWNER>ADMIN>MEMBER>VIEWER); label per mapping.

### Task 2: Slate rail (`sidebar-client.tsx`)
- 216px, `bg-rail-bg`, full-height flex column, fixed left.
- Logo header (54px, bottom `border-rail-border`): 23px rounded-6 `bg-accent-500` tile with a
  white 45°-rotated diamond + wordmark "Promptforge" (`text-[#EEF0F3]`, 13.5px/640).
- Nav list (padding 10, gap 1): each row = 15px stroked lucide icon + 12.5px label, `px-2.5 py-[7px]`,
  rounded-6. Inactive `text-rail-text`; **active `bg-accent-500 text-white font-[550]`**; optional right
  count (`tabular-nums`, active `text-[#CDD2F5]`, inactive `text-rail-text-dim`). Divider before Admin.
- Free-user "Upgrade to Teams" promo card (gradient) above footer when `plan==='FREE'`.
- Footer (top `border-rail-border`): `<Avatar isCurrentUser size="sm">` + name (`text-[#EEF0F3]`) +
  plan label (`text-rail-text-dim`).
- Props: `{ user, isAdmin, plan, roleLabel, counts: { prompts, favorites } }`. Drop the collapse/ThemeToggle
  (light-only now; keep mobile behavior via the existing Sheet in header).

### Task 3: Server sidebar (`sidebar.tsx`)
- Fetch `getCurrentUser()`; `getPlanContext(user.id)`; counts via `db.prompt.count({where:{userId}})` and
  `db.promptFavorite.count({where:{userId}})`. Pass all to `SidebarClient`. `isAdmin = role===ADMIN`.

### Task 4: Topbar (`header.tsx`)
- 54px, `bg-surface-card`, bottom `border-line-200`, `px-5`, flex, `gap-3.5`. Keep mobile Sheet trigger,
  TeamSwitcher, `AuthUserButton`. Replace gradient/dell styling with ink/line/accent tokens. Title slot left.

## Verify
- `npm test` (plan + existing), `npx tsc --noEmit`, local `npm run build` (CSS compiles).
- Deploy (push → CI → force-new-deployment) and Chrome DevTools: rail `bg` = rgb(27,30,37); active nav
  item bg = rgb(94,106,210); body Inter; screenshot the dashboard shell.
