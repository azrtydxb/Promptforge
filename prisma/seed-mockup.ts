/**
 * Mockup-conformance seed: populates the DB with the demo identity + data shown in the
 * Structured Pro mockup so every screen renders real, matching content.
 * Demo login: alex@growth.co / promptforge  (Alex Whitman, Growth Team, Team plan).
 * Idempotent: upserts users/team/tags/folders; skips prompt/market/template seeding if already present.
 */
import { PrismaClient, TeamRole, InvitationStatus, UserRole } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding mockup data…");
  const pw = await bcrypt.hash("promptforge", 10);

  // ---- Users ----
  const mkUser = (email: string, name: string, username: string, role: UserRole = UserRole.USER) =>
    prisma.user.upsert({
      where: { email },
      update: { name, username, role, isActive: true },
      create: { email, name, username, role, isActive: true, password: pw, avatarType: "INITIALS" },
    });

  const alex = await mkUser("alex@growth.co", "Alex Whitman", "alex", UserRole.ADMIN);
  const maya = await mkUser("maya@growth.co", "Maya Roy", "maya");
  const jordan = await mkUser("jordan@growth.co", "Jordan Lee", "jordan");
  const sam = await mkUser("sam@growth.co", "Sam Kerr", "sam");
  const priya = await mkUser("priya@growth.co", "Priya T.", "priya");
  // Platform-admin demo users (frame 11)
  await mkUser("rosa@acme.io", "Rosa Chen", "rosa");
  await mkUser("dev@build.dev", "Dev Mehta", "devm", UserRole.ADMIN);
  await mkUser("liam@studio.co", "Liam Ortiz", "liam");
  await mkUser("nina@labs.ai", "Nina Kaur", "ninak");

  // ---- Growth Team ----
  const team = await prisma.team.upsert({
    where: { slug: "growth-team" },
    update: { name: "Growth Team" },
    create: { name: "Growth Team", slug: "growth-team", description: "Marketing, product & eng", createdById: alex.id },
  });
  const member = (userId: string, role: TeamRole) =>
    prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId } },
      update: { role },
      create: { teamId: team.id, userId, role },
    });
  await member(alex.id, TeamRole.OWNER);
  await member(maya.id, TeamRole.ADMIN);
  await member(jordan.id, TeamRole.MEMBER);
  await member(sam.id, TeamRole.MEMBER);
  await member(priya.id, TeamRole.VIEWER);
  // Pending invite (devin)
  const existingInvite = await prisma.teamInvitation.findFirst({ where: { teamId: team.id, email: "devin@growth.co" } });
  if (!existingInvite) {
    await prisma.teamInvitation.create({
      data: {
        teamId: team.id, email: "devin@growth.co", role: TeamRole.MEMBER, invitedById: alex.id,
        status: InvitationStatus.PENDING, expiresAt: new Date(Date.now() + 7 * 864e5),
      },
    });
  }

  // ---- Subscription (Growth Team = Business, so Alex can see Team + Business features) ----
  await prisma.subscription.upsert({
    where: { teamId: team.id },
    update: { plan: "BUSINESS", seatsTotal: 12, seatsUsed: 8, unitPriceCents: 1800 },
    create: {
      teamId: team.id, plan: "BUSINESS", seatsTotal: 12, seatsUsed: 8, billingCycle: "MONTHLY",
      unitPriceCents: 1800, status: "ACTIVE", renewsAt: new Date("2026-07-14"),
    },
  });
  // ---- SAML / SSO (Business, Okta) ----
  await prisma.samlConnection.upsert({
    where: { teamId: team.id },
    update: { status: "ACTIVE" },
    create: {
      teamId: team.id, status: "ACTIVE", requireSso: true, scimEnabled: true,
      defaultRole: TeamRole.MEMBER, lastSyncAt: new Date(),
      idpSsoUrl: "https://growth.okta.com/app/promptforge/sso/saml",
      idpEntityId: "http://www.okta.com/exk1a2b3c4D5e6F7g8",
      x509Cert: "-----BEGIN CERTIFICATE-----\nMIIDpDCCAoygAwIBAgIGAY3f...kQ2Vx8n2hUe1qLZ\n3pK9sFwTn0aQ7vYbN4mC1dXe...pR8oUjs2zHfP0iV\n-----END CERTIFICATE-----",
      certExpiresAt: new Date("2027-03-01"),
    },
  });
  for (const [domain, status] of [["growth.co", "VERIFIED"], ["growthlabs.io", "PENDING_DNS"]] as const) {
    const existing = await prisma.verifiedDomain.findFirst({ where: { teamId: team.id, domain } });
    if (!existing) await prisma.verifiedDomain.create({ data: { teamId: team.id, domain, status } });
  }

  // ---- Folders (Alex) ----
  const folderByName: Record<string, string> = {};
  for (const name of ["Marketing", "Product", "Support"]) {
    const f = await prisma.folder.findFirst({ where: { userId: alex.id, name } });
    folderByName[name] = (f ?? (await prisma.folder.create({ data: { name, userId: alex.id } }))).id;
  }

  // ---- Tags ----
  const tagNames = ["writing", "marketing", "code", "support", "seo", "sales", "social", "outreach", "testing", "notes", "data", "research", "brief", "triage", "email", "release", "product", "review"];
  const tagId: Record<string, string> = {};
  for (const name of tagNames) {
    const t = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
    tagId[name] = t.id;
  }

  // ---- Prompts (Alex) ----
  const named = [
    { title: "Cold outreach email — SaaS", folder: "Marketing", tags: ["sales", "outreach", "marketing"], uses: 342, v: 7, desc: "Personalized B2B cold email with a hook, a specific value prop and a soft CTA.", pinned: true, rating: 4.8 },
    { title: "Unit test generator (Jest)", folder: "Product", tags: ["code", "testing"], uses: 218, v: 12, desc: "Generates Jest unit tests for a TypeScript function, including edge cases.", rating: 4.7 },
    { title: "Product launch tweet thread", folder: "Marketing", tags: ["social", "marketing"], uses: 571, v: 4, desc: "Turns a launch brief into a punchy 6-tweet thread with a strong opener.", rating: 4.6 },
    { title: "Support reply — refund policy", folder: "Support", tags: ["support"], uses: 189, v: 9, desc: "Empathetic support reply explaining the refund window and next steps.", rating: 4.5 },
    { title: "SEO blog outline generator", folder: "Marketing", tags: ["writing", "seo"], uses: 263, v: 4, desc: "Builds a structured H2/H3 outline from a single target keyword.", rating: 4.4 },
    { title: "Meeting notes summarizer", folder: "Product", tags: ["notes"], uses: 147, v: 6, desc: "Condenses a transcript into decisions, action items and owners.", rating: 4.3 },
    { title: "SQL query from plain English", folder: "Product", tags: ["code", "data"], uses: 204, v: 8, desc: "Converts a natural-language question into parameterized SQL against a schema.", rating: 4.7 },
    { title: "Landing page hero copy", folder: "Marketing", tags: ["writing"], uses: 132, v: 5, desc: "Five hero headline + subhead pairs tuned to a value prop and persona.", rating: 4.5 },
  ];

  const promptCount = await prisma.prompt.count({ where: { userId: alex.id } });
  if (promptCount === 0) {
    const content = `# Role\nYou are a senior assistant.\n\n# Context\nProduct: {{product}} · Recipient: {{role}} at {{company}}\n\n# Task\nWrite output in a {{tone}} tone.`;
    for (const p of named) {
      const created = await prisma.prompt.create({
        data: {
          title: p.title, description: p.desc, content, userId: alex.id, folderId: folderByName[p.folder],
          usageCount: p.uses, averageRating: p.rating, ratingCount: Math.round(p.uses / 8),
          lastUsedAt: new Date(Date.now() - Math.round(Math.random() * 5) * 864e5),
          pinnedAt: p.pinned ? new Date() : null,
          tags: { connect: p.tags.map((t) => ({ id: tagId[t] })) },
        },
      });
      for (let v = 1; v <= Math.min(p.v, 4); v++) {
        await prisma.promptVersion.create({
          data: { promptId: created.id, content, version: `v${v}`, changeMessage: v === 1 ? "Initial" : "Refined" },
        });
      }
    }
    // Filler to ~248 total
    const folders = ["Marketing", "Product", "Support"];
    const verbs = ["Generate", "Rewrite", "Summarize", "Draft", "Translate", "Classify", "Extract", "Improve"];
    const nouns = ["blog post", "email", "tweet", "spec", "changelog", "report", "FAQ", "ad copy", "release note", "subject line"];
    const target = 248 - named.length;
    for (let i = 0; i < target; i++) {
      const folder = folders[i % 3];
      const tg = tagNames[i % tagNames.length];
      const filler = await prisma.prompt.create({
        data: {
          title: `${verbs[i % verbs.length]} ${nouns[i % nouns.length]} #${i + 1}`,
          description: "Reusable prompt for everyday work, tuned for tone and structure.",
          content, userId: alex.id, folderId: folderByName[folder],
          usageCount: 20 + ((i * 37) % 480), averageRating: 4 + ((i % 10) / 10),
          ratingCount: 3 + (i % 40), lastUsedAt: new Date(Date.now() - (i % 60) * 864e5),
          tags: { connect: [{ id: tagId[tg] }] },
        },
      });
      // Every prompt carries a version history (prototype shows "· vN" on every card).
      const nver = 1 + (i % 9);
      for (let v = 1; v <= nver; v++) {
        await prisma.promptVersion.create({
          data: { promptId: filler.id, content, version: `v${v}`, changeMessage: v === 1 ? "Initial" : "Refined" },
        });
      }
    }
    console.log("✅ 248 prompts created for Alex");
  } else {
    console.log(`↷ ${promptCount} prompts already exist for Alex — skipping prompt seed`);
  }

  // Backfill: ensure every one of Alex's prompts has real content + description.
  // Some early-seed rows (the curated named prompts) were created before these fields
  // were set, leaving empty content ("No content" in Quick Preview) and no card blurb.
  // The prototype shows a description on every card. Runs idempotently.
  {
    const defaultContent = `# Role\nYou are a senior assistant.\n\n# Context\nProduct: {{product}} · Recipient: {{role}} at {{company}}\n\n# Task\nWrite output in a {{tone}} tone.`;
    const genericDesc = "Reusable prompt for everyday work, tuned for tone and structure.";
    const incomplete = await prisma.prompt.findMany({
      where: {
        userId: alex.id,
        OR: [{ content: "" }, { description: null }, { description: "" }],
      },
      select: { id: true, title: true, content: true, description: true },
    });
    let fixed = 0;
    for (const pr of incomplete) {
      const namedMatch = named.find((n) => n.title === pr.title);
      const newContent = pr.content && pr.content.trim() ? pr.content : defaultContent;
      const newDesc =
        pr.description && pr.description.trim()
          ? pr.description
          : namedMatch?.desc ?? genericDesc;
      await prisma.prompt.update({
        where: { id: pr.id },
        data: { content: newContent, description: newDesc },
      });
      fixed++;
    }
    if (fixed) console.log(`✅ Backfilled content/description for ${fixed} prompts`);
  }

  // Backfill: ensure every one of Alex's prompts has ≥1 version (prototype shows a
  // version badge on every card). Runs idempotently even when prompts already exist.
  {
    const noVersion = await prisma.prompt.findMany({
      where: { userId: alex.id, versions: { none: {} } },
      select: { id: true, content: true },
    });
    let backfilled = 0;
    for (let i = 0; i < noVersion.length; i++) {
      const pr = noVersion[i];
      const nver = 1 + (i % 9);
      for (let v = 1; v <= nver; v++) {
        await prisma.promptVersion.create({
          data: { promptId: pr.id, content: pr.content ?? "", version: `v${v}`, changeMessage: v === 1 ? "Initial" : "Refined" },
        });
      }
      backfilled++;
    }
    if (backfilled) console.log(`✅ Backfilled versions for ${backfilled} prompts`);
  }

  // Backfill: spread Alex's prompts' createdAt over the last ~12 weeks so the Dashboard
  // "Growth" sparkline renders a real rising curve (otherwise every prompt shares one
  // createdAt → a single data point → a dot) and "Recent activity" shows varied times.
  {
    const all = await prisma.prompt.findMany({
      where: { userId: alex.id },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const N = all.length;
    const SPAN_DAYS = 84; // 12 weeks
    const now = Date.now();
    for (let i = 0; i < N; i++) {
      // Oldest first → newest last, with mild jitter so weekly buckets fill in.
      const frac = N > 1 ? i / (N - 1) : 1;
      const daysAgo = Math.round((1 - frac) * SPAN_DAYS - (i % 3));
      const created = new Date(now - Math.max(0, daysAgo) * 864e5);
      await prisma.prompt.update({
        where: { id: all[i].id },
        data: { createdAt: created },
      });
    }
    if (N) console.log(`✅ Spread createdAt over ${SPAN_DAYS}d for ${N} prompts`);
  }

  // Backfill: favorite Alex's top prompts so the "Favorites" nav count + page are
  // populated (prototype shows a non-zero Favorites count). Idempotent.
  {
    const FAV_TARGET = 31;
    const top = await prisma.prompt.findMany({
      where: { userId: alex.id },
      select: { id: true },
      take: FAV_TARGET,
      orderBy: { usageCount: "desc" },
    });
    const res = await prisma.promptFavorite.createMany({
      data: top.map((p) => ({ promptId: p.id, userId: alex.id })),
      skipDuplicates: true,
    });
    if (res.count) console.log(`✅ Favorited ${res.count} prompts for Alex`);
  }

  // ---- Prompt Market (public SharedPrompts) ----
  const marketCount = await prisma.sharedPrompt.count();
  if (marketCount === 0) {
    const market = [
      { title: "Senior code reviewer — bugs & smells", cat: "Engineering", author: maya, rating: 4.9, views: 4200, copies: 318, tags: ["code", "review"], desc: "Staff-engineer review of a diff: correctness, security and style, returned as prioritized comments." },
      { title: "SQL from plain English", cat: "Data", author: priya, rating: 4.8, views: 3400, copies: 207, tags: ["data", "code"], desc: "Turns a natural-language question into a parameterized SQL query against your schema." },
      { title: "Cold email personalizer", cat: "Sales", author: maya, rating: 4.7, views: 2600, copies: 176, tags: ["sales", "email"], desc: "Researches a prospect and writes a personalized, non-spammy opening line." },
      { title: "Explain like I'm a PM", cat: "Writing", author: jordan, rating: 4.7, views: 2100, copies: 142, tags: ["writing", "product"], desc: "Translates a dense technical concept into a crisp product narrative with an analogy." },
      { title: "Changelog from commits", cat: "Engineering", author: sam, rating: 4.6, views: 1600, copies: 89, tags: ["code", "release"], desc: "Reads a list of git commits and writes a grouped, human changelog." },
      { title: "Landing page hero copy", cat: "Marketing", author: alex, rating: 4.5, views: 980, copies: 54, tags: ["writing", "marketing"], desc: "Generates five hero headline + subhead pairs tuned to a value prop and persona." },
    ];
    for (const m of market) {
      const src = await prisma.prompt.create({
        data: { title: m.title, description: m.desc, content: "# Role\nYou are an expert.\n\n# Task\nDo the task for {{input}}.", userId: m.author.id, usageCount: m.copies, tags: { connect: m.tags.map((t) => ({ id: tagId[t] })) } },
      });
      await prisma.sharedPrompt.create({
        data: {
          promptId: src.id, authorId: m.author.id, title: m.title, description: m.desc,
          content: src.content!, category: m.cat, isPublished: true, status: "APPROVED",
          viewCount: m.views, likeCount: Math.round(m.copies * 0.6), copyCount: m.copies,
          averageRating: m.rating, ratingCount: Math.round(m.views / 30), publishedAt: new Date(),
        },
      });
    }
    console.log("✅ Prompt Market listings created");
  }

  // ---- Templates ----
  const tmplCount = await prisma.promptTemplate.count();
  if (tmplCount === 0) {
    const templates = [
      { name: "Blog post from outline", cat: "Writing", uses: 1200, desc: "Expands a bullet outline into a full draft with intro, sections and a CTA." },
      { name: "Code review assistant", cat: "Engineering", uses: 4200, desc: "Reviews a diff for bugs, security and style; returns prioritized comments." },
      { name: "Ad copy variations", cat: "Marketing", uses: 890, desc: "Generates 10 ad headline + body variations for A/B testing a campaign." },
      { name: "Support macro writer", cat: "Support", uses: 640, desc: "Drafts an empathetic, on-brand reply from a ticket summary and policy." },
      { name: "SQL explainer", cat: "Data", uses: 510, desc: "Translates a complex query into plain-English steps with an example result." },
      { name: "Meeting recap", cat: "Writing", uses: 1100, desc: "Turns a transcript into decisions, action items and owners in a clean table." },
    ];
    for (const t of templates) {
      await prisma.promptTemplate.create({
        data: { name: t.name, description: t.desc, category: t.cat, content: "Template with {{variable}}.", variables: [], usageCount: t.uses, rating: 4.6, authorId: alex.id },
      });
    }
    console.log("✅ Templates created");
  }

  // ---- Team prompts shared with the team (frame 04 "shared with you") ----
  const teamPromptCount = await prisma.teamPrompt.count({ where: { teamId: team.id } });
  if (teamPromptCount === 0) {
    const dev = await prisma.user.findUnique({ where: { email: "dev@build.dev" } });
    const shared = [
      { title: "Q3 campaign brief writer", by: maya.id, desc: "Drafts a structured campaign brief from goals, audience and channels.", days: 2 },
      { title: "Bug triage assistant", by: dev?.id ?? jordan.id, desc: "Classifies and prioritizes incoming bug reports with a suggested severity.", days: 4 },
      { title: "Investor update draft", by: sam.id, desc: "Monthly investor update from metrics, wins, lowlights and asks.", days: 7 },
      { title: "Customer interview synth", by: priya.id, desc: "Synthesizes interview transcripts into themes, quotes and opportunities.", days: 9 },
      { title: "Release notes writer", by: jordan.id, desc: "Turns merged PRs into friendly, grouped release notes.", days: 14 },
      { title: "Onboarding email series", by: maya.id, desc: "Five-email onboarding sequence tuned to activation milestones.", days: 21 },
    ];
    for (const s of shared) {
      await prisma.teamPrompt.create({
        data: {
          teamId: team.id, title: s.title, description: s.desc, createdById: s.by,
          content: "# Role\nYou are an expert.\n\n# Task\nDo the task for {{input}}.",
          viewCount: 40, copyCount: 12,
          createdAt: new Date(Date.now() - s.days * 864e5),
        },
      });
    }
    console.log("✅ Team shared prompts created");
  }

  console.log("🎉 Mockup seed complete");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
