# Phase 1 — Design Tokens, Fonts & Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the "Structured Pro" design foundation — indigo/slate color tokens, Inter + JetBrains Mono fonts, and the current-user gradient Avatar convention — so all later screen work consumes semantic tokens instead of hardcoded hexes.

**Architecture:** Define the palette as CSS custom properties in `globals.css`, expose them as Tailwind color utilities via `tailwind.config.ts` (the repo's established pattern), swap the body font from Nunito to Inter and wire a real JetBrains Mono via `next/font`, and extend the existing `Avatar` component with an `isCurrentUser` gradient variant per the spec.

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS v4, `next/font/google`, Jest + Testing Library.

**Spec reference:** `docs/superpowers/specs/2026-06-13-promptforge-structured-pro-redesign-design.md` §A.

---

## File Structure

- Modify `src/app/globals.css` — add Structured Pro CSS custom properties; switch body font to Inter.
- Modify `tailwind.config.ts` — map the new tokens to Tailwind color/fontFamily utilities.
- Modify `src/app/layout.tsx` — load JetBrains Mono via `next/font`, make Inter the base body font.
- Modify `src/lib/avatar-utils.ts` — add `OTHER_AVATAR_BG`/`OTHER_AVATAR_FG` constants per spec.
- Modify `src/components/ui/avatar.tsx` — add `isCurrentUser` gradient variant.
- Create `src/lib/__tests__/design-tokens.test.ts` — guards required tokens exist.
- Create `src/components/ui/__tests__/avatar.test.tsx` — guards Avatar variants.

---

## Task 1: Define Structured Pro color tokens in globals.css

**Files:**
- Test: `src/lib/__tests__/design-tokens.test.ts` (create)
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/design-tokens.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

const REQUIRED_TOKENS: Array<[string, string]> = [
  ['--sp-accent-700', '#3F49B8'],
  ['--sp-accent-500', '#5E6AD2'],
  ['--sp-accent-400', '#7C87E8'],
  ['--sp-accent-300', '#8B93E0'],
  ['--sp-accent-200', '#C2C8F0'],
  ['--sp-accent-150', '#DFE2F6'],
  ['--sp-accent-100', '#EEF0FB'],
  ['--sp-accent-border', '#DDE1F7'],
  ['--sp-ink-900', '#1B1D22'],
  ['--sp-ink-700', '#42475A'],
  ['--sp-ink-600', '#5C616B'],
  ['--sp-ink-400', '#8A8F99'],
  ['--sp-ink-300', '#A4A8B1'],
  ['--sp-line-200', '#E4E6EB'],
  ['--sp-line-150', '#EEF0F3'],
  ['--sp-line-100', '#F4F5F7'],
  ['--sp-surface-sunken', '#E7E9ED'],
  ['--sp-surface-app', '#F5F6F8'],
  ['--sp-surface-muted', '#F3F4F7'],
  ['--sp-surface-card', '#FFFFFF'],
  ['--sp-rail-bg', '#1B1E25'],
  ['--sp-rail-border', '#282C35'],
  ['--sp-rail-text', '#9BA1AD'],
  ['--sp-rail-text-dim', '#6B7280'],
  ['--sp-success', '#3A9D6E'],
  ['--sp-success-surface', '#E8F4EE'],
  ['--sp-warning', '#D98C3F'],
  ['--sp-warning-surface', '#FBF2E6'],
  ['--sp-danger', '#CD5B62'],
  ['--sp-danger-surface', '#F0D6D8'],
  ['--sp-business', '#7A5CD0'],
  ['--sp-business-surface', '#F1ECFB'],
  ['--sp-business-border', '#E4D9F7'],
  ['--sp-star', '#F2B333'],
];

describe('Structured Pro design tokens', () => {
  it.each(REQUIRED_TOKENS)('defines %s = %s', (token, value) => {
    const re = new RegExp(`${token}\\s*:\\s*${value}`, 'i');
    expect(css).toMatch(re);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- design-tokens`
Expected: FAIL — tokens not found in globals.css.

- [ ] **Step 3: Add the token block to globals.css**

In `src/app/globals.css`, inside the existing `@layer base { :root { ... } }` block (after the closing of the existing variable list, before the closing `}` of `:root`), add:

```css
    /* ===== Structured Pro design tokens ===== */
    /* Accent (indigo) */
    --sp-accent-700: #3F49B8;
    --sp-accent-500: #5E6AD2;
    --sp-accent-400: #7C87E8;
    --sp-accent-300: #8B93E0;
    --sp-accent-200: #C2C8F0;
    --sp-accent-150: #DFE2F6;
    --sp-accent-100: #EEF0FB;
    --sp-accent-border: #DDE1F7;
    /* Ink (cool slate text) */
    --sp-ink-900: #1B1D22;
    --sp-ink-700: #42475A;
    --sp-ink-600: #5C616B;
    --sp-ink-400: #8A8F99;
    --sp-ink-300: #A4A8B1;
    /* Lines & surfaces */
    --sp-line-200: #E4E6EB;
    --sp-line-150: #EEF0F3;
    --sp-line-100: #F4F5F7;
    --sp-surface-sunken: #E7E9ED;
    --sp-surface-app: #F5F6F8;
    --sp-surface-muted: #F3F4F7;
    --sp-surface-card: #FFFFFF;
    /* Dark slate rail */
    --sp-rail-bg: #1B1E25;
    --sp-rail-border: #282C35;
    --sp-rail-text: #9BA1AD;
    --sp-rail-text-dim: #6B7280;
    /* Semantic */
    --sp-success: #3A9D6E;
    --sp-success-surface: #E8F4EE;
    --sp-warning: #D98C3F;
    --sp-warning-surface: #FBF2E6;
    --sp-danger: #CD5B62;
    --sp-danger-surface: #F0D6D8;
    --sp-business: #7A5CD0;
    --sp-business-surface: #F1ECFB;
    --sp-business-border: #E4D9F7;
    --sp-star: #F2B333;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- design-tokens`
Expected: PASS (all token cases green).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/lib/__tests__/design-tokens.test.ts
git commit -m "Add Structured Pro color tokens to globals.css"
```

---

## Task 2: Expose tokens as Tailwind utilities

**Files:**
- Test: `src/lib/__tests__/design-tokens.test.ts` (extend)
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add a failing config assertion**

Append to `src/lib/__tests__/design-tokens.test.ts`:

```ts
import config from '../../../tailwind.config';

describe('Tailwind exposes Structured Pro tokens', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colors = (config.theme as any).extend.colors as Record<string, unknown>;

  it('maps the accent ramp', () => {
    expect(colors.accent).toMatchObject({
      500: 'var(--sp-accent-500)',
      700: 'var(--sp-accent-700)',
      100: 'var(--sp-accent-100)',
    });
  });

  it('maps ink, line, surface, rail and semantic groups', () => {
    expect(colors.ink).toMatchObject({ 900: 'var(--sp-ink-900)' });
    expect(colors.line).toMatchObject({ 200: 'var(--sp-line-200)' });
    expect(colors.surface).toMatchObject({ card: 'var(--sp-surface-card)' });
    expect(colors.rail).toMatchObject({ bg: 'var(--sp-rail-bg)' });
    expect(colors.business).toMatchObject({ DEFAULT: 'var(--sp-business)' });
  });
});
```

> Note: `accent` already exists in the config as an HSL shadcn token. Replacing its value is intentional — the new accent ramp supersedes it. Verify no component depends on the old `accent` HSL meaning during Phase 2 shell work; shadcn's `accent` usage is restyled there.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- design-tokens`
Expected: FAIL on the new `describe` block.

- [ ] **Step 3: Add the color groups to `tailwind.config.ts`**

In `tailwind.config.ts`, inside `theme.extend.colors`, add (and replace the existing `accent` key with this object form):

```ts
      accent: {
        DEFAULT: 'var(--sp-accent-500)',
        100: 'var(--sp-accent-100)',
        150: 'var(--sp-accent-150)',
        200: 'var(--sp-accent-200)',
        300: 'var(--sp-accent-300)',
        400: 'var(--sp-accent-400)',
        500: 'var(--sp-accent-500)',
        700: 'var(--sp-accent-700)',
        border: 'var(--sp-accent-border)',
        foreground: '#FFFFFF',
      },
      ink: {
        900: 'var(--sp-ink-900)',
        700: 'var(--sp-ink-700)',
        600: 'var(--sp-ink-600)',
        400: 'var(--sp-ink-400)',
        300: 'var(--sp-ink-300)',
      },
      line: {
        200: 'var(--sp-line-200)',
        150: 'var(--sp-line-150)',
        100: 'var(--sp-line-100)',
      },
      surface: {
        sunken: 'var(--sp-surface-sunken)',
        app: 'var(--sp-surface-app)',
        muted: 'var(--sp-surface-muted)',
        card: 'var(--sp-surface-card)',
      },
      rail: {
        bg: 'var(--sp-rail-bg)',
        border: 'var(--sp-rail-border)',
        text: 'var(--sp-rail-text)',
        'text-dim': 'var(--sp-rail-text-dim)',
      },
      success: { DEFAULT: 'var(--sp-success)', surface: 'var(--sp-success-surface)' },
      warning: { DEFAULT: 'var(--sp-warning)', surface: 'var(--sp-warning-surface)' },
      danger: { DEFAULT: 'var(--sp-danger)', surface: 'var(--sp-danger-surface)' },
      business: {
        DEFAULT: 'var(--sp-business)',
        surface: 'var(--sp-business-surface)',
        border: 'var(--sp-business-border)',
      },
      star: 'var(--sp-star)',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- design-tokens`
Expected: PASS.

- [ ] **Step 5: Verify the build still compiles Tailwind**

Run: `npm run typecheck`
Expected: PASS (no TS errors in the config).

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/lib/__tests__/design-tokens.test.ts
git commit -m "Expose Structured Pro tokens as Tailwind utilities"
```

---

## Task 3: Wire Inter (UI) + JetBrains Mono (mono) fonts

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Load JetBrains Mono and base Inter in `layout.tsx`**

In `src/app/layout.tsx`, update the font imports/instances. Replace the `Inter, Nunito` import line and the font setup with:

```tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
```

Then update the `<body>` className to use Inter as base and expose both variables. Replace the existing `<body className={...}>` with:

```tsx
      <body className={cn("antialiased", inter.variable, jetbrainsMono.variable, "font-sans")}>
```

> Remove the now-unused `nunito` and `systemMono` declarations and their references.

- [ ] **Step 2: Point the base font-family at Inter in `globals.css`**

In `src/app/globals.css`:
- In the top `:root` block (lines ~3-6), replace the `--font-nunito` line with:

```css
  --font-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

- In the `body { ... }` rule (around line 222), change `font-family: var(--font-nunito);` to:

```css
    font-family: var(--font-inter);
```

- [ ] **Step 3: Map font families in `tailwind.config.ts`**

In `tailwind.config.ts` `theme.extend.fontFamily`, set:

```ts
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
```

- [ ] **Step 4: Verify build + types**

Run: `npm run typecheck && npm run lint`
Expected: PASS, with no references to removed `nunito`/`systemMono` symbols.

- [ ] **Step 5: Visual smoke check**

Run: `npm run dev`, open the app, confirm body text renders in Inter and any `font-mono` element renders in JetBrains Mono (DevTools → Computed → font-family). Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css tailwind.config.ts
git commit -m "Switch UI font to Inter and wire JetBrains Mono"
```

---

## Task 4: Add the current-user gradient Avatar convention

**Files:**
- Test: `src/components/ui/__tests__/avatar.test.tsx` (create)
- Modify: `src/lib/avatar-utils.ts`
- Modify: `src/components/ui/avatar.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/avatar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Avatar, type AvatarUser } from '../avatar';

const user: AvatarUser = {
  id: 'u1',
  name: 'Alex Whitman',
  email: 'alex@growth.co',
  username: 'alex',
  avatarType: 'INITIALS',
  profilePicture: null,
  gravatarEmail: null,
};

describe('Avatar Structured Pro variants', () => {
  it('renders initials', () => {
    render(<Avatar user={user} />);
    expect(screen.getByText('AW')).toBeInTheDocument();
  });

  it('uses the indigo gradient for the current user', () => {
    render(<Avatar user={user} isCurrentUser />);
    const el = screen.getByText('AW').closest('[data-avatar]') as HTMLElement;
    expect(el.style.background).toContain('linear-gradient');
    expect(el.style.color).toBe('rgb(255, 255, 255)');
  });

  it('uses the soft indigo fill for other users', () => {
    render(<Avatar user={user} />);
    const el = screen.getByText('AW').closest('[data-avatar]') as HTMLElement;
    // #DFE2F6
    expect(el.style.backgroundColor).toBe('rgb(223, 226, 246)');
    // #3F49B8
    expect(el.style.color).toBe('rgb(63, 73, 184)');
  });
});
```

> `getDisplayInitials` must yield `AW` for "Alex Whitman" — confirm the existing util produces two-letter initials; if it returns single-letter, adjust the expected text to match the util's real output rather than changing the util in this phase.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- avatar`
Expected: FAIL — `isCurrentUser` prop and gradient/fill styling not present.

- [ ] **Step 3: Add spec color constants to `avatar-utils.ts`**

In `src/lib/avatar-utils.ts`, add near the top exports:

```ts
/** Structured Pro: soft indigo fill for other users' initials avatars. */
export const OTHER_AVATAR_BG = '#DFE2F6';
export const OTHER_AVATAR_FG = '#3F49B8';
/** Structured Pro: indigo gradient for the current user's avatar. */
export const CURRENT_USER_AVATAR_GRADIENT = 'linear-gradient(135deg,#5E6AD2,#8B93E0)';
export const CURRENT_USER_AVATAR_FG = '#FFFFFF';
```

- [ ] **Step 4: Add the `isCurrentUser` variant to `avatar.tsx`**

In `src/components/ui/avatar.tsx`:
- Extend the imports:

```tsx
import {
  getAvatarUrl,
  getDisplayInitials,
  OTHER_AVATAR_BG,
  OTHER_AVATAR_FG,
  CURRENT_USER_AVATAR_GRADIENT,
  CURRENT_USER_AVATAR_FG,
} from '@/lib/avatar-utils';
```

- Add `isCurrentUser?: boolean;` to `AvatarProps`.
- In the component, replace the `getInitialsBackgroundColor` usage. Compute the fallback style:

```tsx
export function Avatar({ user, size = 'md', className, fallbackClassName, isCurrentUser = false }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = getAvatarUrl(user, sizePx[size]);
  const initials = getDisplayInitials(user);

  const shouldShowImage = avatarUrl && !imageError;
  const shouldShowInitials = !shouldShowImage;

  const fallbackStyle = isCurrentUser
    ? { background: CURRENT_USER_AVATAR_GRADIENT, color: CURRENT_USER_AVATAR_FG }
    : { backgroundColor: OTHER_AVATAR_BG, color: OTHER_AVATAR_FG };
```

- Add `data-avatar` to the root wrapper element and apply `fallbackStyle` to the element that holds the initials. Ensure the initials container renders like:

```tsx
      {shouldShowInitials && (
        <span
          data-avatar
          style={fallbackStyle}
          className={cn(
            'flex h-full w-full items-center justify-center font-semibold select-none',
            fallbackClassName
          )}
        >
          {initials}
        </span>
      )}
```

> Keep the existing image branch unchanged. Only the initials fallback styling changes.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- avatar`
Expected: PASS.

- [ ] **Step 6: Verify no other caller breaks**

Run: `npm run typecheck`
Expected: PASS. `getInitialsBackgroundColor` may now be unused by `avatar.tsx`; leave the util in place if other files import it (check with `grep -rn getInitialsBackgroundColor src`). Do not delete it if referenced elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/lib/avatar-utils.ts src/components/ui/avatar.tsx src/components/ui/__tests__/avatar.test.tsx
git commit -m "Add current-user gradient Avatar variant per Structured Pro"
```

---

## Task 5: Phase verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS (no regressions; new token + avatar tests green).

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Build smoke**

Run: `npm run build`
Expected: Build completes (fonts resolve, Tailwind compiles new utilities).

- [ ] **Step 4: DevTools visual validation (per CLAUDE.md)**

With `npm run dev` running, use Chrome DevTools MCP to confirm:
- `getComputedStyle(document.body).fontFamily` contains "Inter".
- An element with class `bg-accent-500` resolves to `rgb(94, 106, 210)` (#5E6AD2).
- An element with class `bg-rail-bg` resolves to `rgb(27, 30, 37)` (#1B1E25).
Record the observed values in the phase summary.

---

## Self-Review Notes

- **Spec §A coverage:** accent ramp ✓, ink/line/surface ✓, rail ✓, semantic (success/warning/danger/business/star) ✓, Inter + JetBrains Mono ✓, Avatar convention ✓. Radius/shadow/spacing tokens are applied per-component in later phases (shell/screens), not in this foundational phase — noted intentionally.
- **Token naming:** chose `--sp-*` prefix to avoid collision with the existing shadcn HSL variables (`--accent`, `--primary`) that remain in use until restyled in Phase 2.
- **No placeholders:** every step has concrete code/commands.
- **Type consistency:** `isCurrentUser` prop, `OTHER_AVATAR_BG/FG`, `CURRENT_USER_AVATAR_GRADIENT/FG` names are used identically across utils, component, and tests.
