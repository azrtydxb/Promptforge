import { PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

interface PromptInput {
  title: string;
  tags?: string[];
  content?: string;
}

async function main() {
  const prisma = new PrismaClient();
  const userEmail = "pascal@watteel.com";
  const jsonPath = path.resolve(process.cwd(), "extract.json");

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Could not find extract.json at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const entries = JSON.parse(raw) as PromptInput[];

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    throw new Error(`User with email ${userEmail} not found`);
  }

  const existingPrompts = await prisma.prompt.findMany({
    where: { userId: user.id },
    select: { order: true },
    orderBy: { order: "desc" },
    take: 1,
  });
  let nextOrder = existingPrompts[0]?.order ?? -1;

  for (const entry of entries) {
    const title = entry.title?.trim();
    if (!title) {
      console.warn("Skipping entry without a title:", entry);
      continue;
    }

    nextOrder += 1;

    const content = entry.content ?? "";
    const tags = (entry.tags ?? []).map((tag) => tag.trim()).filter(Boolean);

    const description = content.slice(0, 200);

    const prompt = await prisma.prompt.create({
      data: {
        title,
        description: description || null,
        content,
        userId: user.id,
        order: nextOrder,
        tags: {
          connectOrCreate: tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
        versions: {
          create: {
            content,
            version: "v1",
            changeMessage: "Initial import",
          },
        },
      },
      select: { id: true, title: true },
    });

    console.log(`Imported prompt: ${prompt.title} (${prompt.id}) with ${tags.length} tags`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
