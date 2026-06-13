# Mockup Conformance — Gap Analysis & Master Checklist

Goal: the live app **100% matches** `Promptforge - Structured Pro.dc.html` (all 16 frames),
with **real functions and data** — no mock-only screens, no placeholder content. Source of
truth = the rendered mockup (open in browser), not the README prose.

Legend: ✅ done · 🟡 partial (needs alignment) · ❌ missing.

---

## GLOBAL

### G1. Sidebar / slate rail
- Mockup nav order: Dashboard · My Prompts (248) · Favorites (31) · Templates · **Shared Prompts** ·
  Prompt Market · Teams · Tags · —divider— · Admin.
- We have: same **minus "Shared Prompts"** (dropped). ❌ Add Shared Prompts back (route 04).
- Footer plan label: mockup shows "Pro plan" / "Team · Admin" / "Business · Admin" / "Free plan".
  We show "Free plan" / "Team · <role>". 🟡 align label set + the **free variant** (frame 05) drops
  Shared/Teams/Admin and shows an inline "Upgrade to Teams / See plans" card with "Robin Nash / Free plan".

### G2. Topbar (contextual — varies per screen)
- Mockup: left = **page title** (e.g. "Dashboard"); center/left = **search input with ⌘K**; right =
  contextual control (segmented 7d/30d/90d, breadcrumb, tabs) + **primary action** ("New", "Invite member",
  "Publish", "New template", "New tag", "Edit/Share").
- We have: a static "Personal Workspace" team switcher + avatar on every screen. ❌ Replace with the
  contextual title + search + per-page actions. Needs the layout to pass `title`/`actions`/`search` to Header.

### G3. Real data (mockup is fully populated; our DB has only the admin user)
- ❌ Seed realistic data matching the mockup so every screen is populated with **real rows**:
  - User **Alex Whitman** (alex@growth.co), team **Growth Team** (members Maya/Jordan/Sam/Priya + pending devin).
  - ~248 personal prompts across folders **Marketing/Product/Support** with versions, uses, tags
    (the 8 named cards: Cold outreach email — SaaS, Unit test generator (Jest), Product launch tweet thread,
    Support reply — refund policy, SEO blog outline generator, Meeting notes summarizer, SQL query from plain
    English, Landing page hero copy …).
  - Tags: writing(86), marketing(61), code(47), support(39), seo(28), sales(24), social(19) with shared counts.
  - **Shared-with-me** (6): Q3 campaign brief writer, Bug triage assistant, Investor update draft, Customer
    interview synth, Release notes writer, Onboarding email series (sharers + Can edit/view).
  - **Prompt Market** public listings (Senior code reviewer 4.9/4.2k/318, SQL from plain English, Cold email
    personalizer, Explain like I'm a PM, Changelog from commits, Landing page hero copy …) with author, rating,
    views, copies, category, tags.
  - **Templates** (Blog post from outline, Code review assistant, Ad copy variations, Support macro writer,
    SQL explainer, Meeting recap) with category + "Used N times".
  - **Admin**: users (Rosa Chen/Dev Mehta/Liam Ortiz/Nina Kaur), moderation queue, service health.

---

## 01 · Dashboard  🟡
Mockup: topbar "Dashboard" + search(⌘K) + 7d/30d/90d + **New**. KPI bar cells = **TOTAL PROMPTS 248 ↑12% ·
USED THIS WEEK 87 ↑9% · AVG. RATING 4.6 /5 · VERSIONS 1,204** + sparkline. Table "Top prompts this week"
cols **PROMPT · FOLDER · USES · VER. · UPDATED** with **Filter**; folder cell = colored dot + name. Right rail
By folder donut (Marketing 42 / Product 28 / Support 16%) + Recent activity.
- Gaps: our KPI cells are **Total/Folders/Tags/Versions** (wrong 4) + no deltas, no Avg rating, no "Used this
  week". ❌ change metrics to match + add ↑% deltas. Table cols ok but need **VER.** col + colored folder dot +
  **Filter** control. Topbar **New** + search missing (G2). Needs avg-rating + used-this-week + version-count data.

## 02 · My Prompts  🟡 (rebuilt; verify vs mockup)
Mockup: header "My Prompts / 248 total" + **Import** + **New prompt**; toolbar search + pills All/Marketing/
Product/Support + **Sort: Recently used**; 3-col cards (icon tile + **folder/Pinned badge**, title, desc, tag
pills, footer "342 uses · v7" + **Quick preview** eye + **Open**); **pagination** (‹ 1 2 3 … 31 ›).
- Gaps: pills are folder names (ok); need **Pinned**/folder badge on cards (card has it); ❌ **pagination** not
  implemented; need real prompts (G3). Card "Quick preview" must open the Quick Preview modal (frame 13), not link.

## 03 · Prompt detail  ❌ (not reskinned)
Mockup: breadcrumb "My Prompts / <title>" + favorite icon + **Share** + **Edit**. Title card (name + **v7** badge +
desc + tag pills). **Prompt content** card (mono, highlighted `{{variables}}` chips, **Copy**). **Variables** card
(2-col name/type rows). Right rail **Usage** 2×2 (342 uses / 4.8 rating / 7 versions / 34 favorites) + **Version
history** timeline (v7 Current highlighted, change summary, "time · author").
- Gaps: entire screen ❌. Need `{{variable}}` highlighter, variables list, usage stats, version timeline,
  Share/Edit actions wired.

## 04 · Shared Prompts (team, shared-with-me)  ❌
Mockup: topbar "Shared Prompts / 6 shared with you / search". Info banner pointing to Prompt Market. Pills
All/Can edit/Can view/From my team. 3-col cards w/ **access badge** (Can edit/Can view), "Shared by <name> · time"
+ avatar, tags, Preview + Open.
- Gaps: route + screen ❌. Needs a real **prompt-share-with-user** model/query (shared directly with me). Plan-gated Team+.

## 05 · Shared Prompts (free, gated)  ❌
Mockup: free sidebar variant + blurred skeleton + centered **upsell card** ("Shared Prompts is a Teams feature",
3-item green check list, **See Teams plans**, "Starts at $9 / seat / month").
- Gaps: ❌ build upsell gate; render for FREE users deep-linking /shared-prompts; free sidebar variant already exists.

## 06 · Prompt Market  ❌ (not reskinned)
Mockup: topbar "Prompt Market" + **Publish**. Prominent search ("Search 12,480 public prompts…" + `/`) + **Sort:
Trending**. Active-filter row ("Filters: Engineering ✕ · 4★ & up ✕ · Clear all" + "1,284 results"). 2-col layout
**230px filter rail** (Sort by radios / Category checkboxes / Min rating stars / Popular tags) + 2-col market cards
(category badge + ⭐rating, title, desc, author row + views/likes, tags, Preview + **Copy**).
- Gaps: entire screen ❌. Needs filter rail, prominent search, result count, market cards w/ rating/views/copies,
  real published prompts + ratings data.

## 07 · Templates  ❌ (not reskinned)
Mockup: topbar "Templates / search / **New template**". Category pills All/Writing/Engineering/Marketing/Support/
Data. 3-col template cards (icon tile + **category badge**, title, desc, "Used N times", Quick preview + **Use**).
- Gaps: entire screen ❌. Real templates + usage counts.

## 08 · Teams (admin)  ❌ (not reskinned)
Mockup: topbar "Teams" + **team switcher (Growth Team ▾)** + **Invite member**. KPI bar Members 8/12 · Shared
prompts 126 · Team folders 9 · Active today 5. Admin banner. **Members & roles** table cols MEMBER · EMAIL · ROLE ·
LAST ACTIVE · MANAGE; Owner=locked badge; others=role dropdown + **Remove** + ⋯; pending invite row (dashed avatar,
"Invited", **Resend**).
- Gaps: entire screen ❌. Needs real team + members + roles + pending invites + seat usage; role-change/remove/resend
  actions; KPIs from real counts.

## 09 · Plans & billing  🟡 (built)
Mockup: tabs **Teams / Plans / Members** + "Billed annually · save 20%". Current-plan banner ("Growth Team is on the
Team plan · 8 of 12 seats used · renews Jan 14, 2026 · $108/mo") + **seat stepper − 12 +** + Update seats. 3 cards
(Individual $0 forever **Current plan** muted; Team $9 featured "Your plan"/"Current plan"; Business $18 **Upgrade**).
Comparison table rows: Personal prompts(Unlimited×3) · Templates & Market · **Quick preview & copy** · Shared Prompts
(private) · Shared team folders · Roles & permissions · Team admin & seats · SSO/SAML & audit · Support
(Community/Email/Priority).
- Gaps: ❌ tabs (Teams/Plans/Members); current-plan banner only shows for paid (ok) but needs real Subscription
  (seats/renews/price). Comparison rows differ slightly (add "Personal prompts Unlimited", "Quick preview & copy").
  Real **Subscription** model + seat update action needed (currently mocked).

## 10 · Tags  🟡 (table built)
Mockup: topbar "Tags / 63 tags / search / **New tag**". Table cols TAG · PROMPTS · SHARED · CREATED · ⋯; tag cell =
colored pill; created "Mon YYYY".
- Gaps: 🟡 our table lacks the **checkbox column is extra** vs mockup (mockup has no select col — it's TAG/PROMPTS/
  SHARED/CREATED/⋯). ❌ "Shared" count is real (mockup shows 24/18/31…) — we show "—". Need shared-count data + search
  in topbar. Created shows "Mar 2025" format.

## 11 · Admin — Overview  ❌ (not reskinned)
Mockup: tabs Overview/Users/Moderation/AI settings + **All systems operational** pill. 4 KPI cards (Total users
3,482 ↑6% · Prompts stored 128k · Cache hit rate 94.2% · Embedding queue 12 jobs). 2-col: **Recent users** table
(avatar+name+email, role badge, prompts, status dot Active/Idle/Suspended) + rail (**Moderation queue** severity dots,
**Services** health PostgreSQL/Redis/Embedding/OpenAI).
- Gaps: entire screen ❌. Real user list + status; moderation queue (exists); service health (can be real/derived).

## 12 · Business admin — SSO/SAML  ❌
Mockup: admin tab "Security & SSO" + **Business plan** badge; tabs Overview/Members/Security & SSO/Audit log. Status
card (Okta IdP tile + "Okta SAML 2.0" + Active + "Connected · last sync 4m ago · 8 users via SCIM" + Test connection +
Disable). IdP details (copyable IdP SSO URL, Issuer, x.509 cert block "Valid · expires Mar 2027"). Access policy toggles
(Require SSO / SCIM / Default role Editor). Right rail SP details (ACS URL, SP Entity ID, Metadata URL) + Verified domains
(growth.co Verified, growthlabs.io Pending DNS) + Business note.
- Gaps: entire screen + backend ❌. Needs `SamlConnection` + `VerifiedDomain` schema, copyable fields, toggles,
  mocked Test connection + SCIM endpoint, gated to Business.

## 13 · Quick preview (modal)  ❌
Mockup: 540px modal — category badge + "Quick preview" badge + title; meta (author avatar+name, ⭐4.9, views 4.2k /
likes 318 / copies 96); scrollable mono **PROMPT** with `{{var}}` chips + **Copy text**; footer **Open full prompt** +
**Copy to my library**.
- Gaps: ❌ build modal; wire the **Quick preview** eye button on every card (My Prompts/Templates/Shared/Market) to open it.

## 14 · Invite member (modal)  ❌
Mockup: 470px — "Invite members / Growth Team · 4 of 12 seats available". Email-chips input (DE devin@, RA rae@ + "Type
an email and press Enter…") + hint. **Assign role** 3 radio cards (Admin/Editor/Viewer w/ descriptions). Add to team
folder dropdown (Marketing). Footer "2 invites · 2 seats used" + Cancel + **Send invites**.
- Gaps: ❌ build modal; wire to real invite action (consumes seats, adds pending rows to Teams table).

## 15 · Share dialog (modal)  ❌
Mockup: 460px — "Share prompt / <name>". Info line. **Share with people**: email + Can view/edit + Invite; people
list (Owner label; Maya Can edit; Jordan Can view); "Anyone with the link · Copy link". **Publish to Prompt Market**:
toggle on + Category + live stats (1.2k/318/96) + public URL + Copy. Footer Cancel + **Done**.
- Gaps: ❌ rebuild the existing share modal to this layout + real share + publish actions.

## 16 · Sign in  🟡 (built)
Mockup: left brand panel — logo, headline, subcopy, stats 12k+/3.4k/99.9%, "Trusted by product, marketing & eng teams".
Right: "Welcome back / Sign in to your workspace to continue." **Continue with Google** + "or" divider + Email + Password
(+ **Forgot?**) + Sign in + "Create an account".
- Gaps: 🟡 we dropped **Continue with Google** + the "or" divider + **Forgot?** link + "Trusted by…" line. Mockup HAS
  Google; we have no Google provider. → Either wire Google OAuth (real) or render the button (decision: implement Google
  provider for 100% match). Subcopy wording differs slightly.

---

## EXECUTION ORDER (no deviation from mockup)
1. **Seed real data (G3)** — so every screen shows mockup-equivalent rows. (migrate task)
2. **Sidebar**: re-add Shared Prompts; plan labels; free variant.
3. **Topbar (G2)**: contextual title + search + per-page actions.
4. Dashboard (01) metrics/deltas/table cols.
5. My Prompts (02) pagination + Quick Preview wiring.
6. Prompt detail (03).
7. Prompt Market (06) + filter rail + ratings data.
8. Templates (07).
9. Teams (08) + Invite modal (14) + real team data/actions.
10. Plans (09) tabs + real Subscription model/seats.
11. Tags (10) shared-count + topbar search (drop extra checkbox col).
12. Admin (11) overview.
13. SSO/SAML (12) + SamlConnection/VerifiedDomain + SCIM stub + audit.
14. Quick Preview (13) + Share dialog (15) modals.
15. Shared Prompts (04) + gated upsell (05).
16. Sign-in (16) Google + Forgot + divider.

Each item: build real schema/action where missing → match mockup layout exactly → seed/verify data →
deploy → DevTools-compare against the mockup frame.
