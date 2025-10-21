import { PrismaClient, Tag } from '../src/generated/prisma';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

interface ScrapedPrompt {
  title: string;
  author: string;
  tags: string[];
  description: string;
  prompt: string;
}

async function main() {
  console.log('🌱 Seeding marketplace prompts...');

  const promptsPath = path.join(process.cwd(), 'scraped-prompts.json');
  const promptsFile = await fs.readFile(promptsPath, 'utf-8');
  const promptsData: ScrapedPrompt[] = JSON.parse(promptsFile);

  for (const promptData of promptsData) {
    try {
      let user = await prisma.user.findUnique({
        where: { email: `${promptData.author}@example.com` },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: promptData.author,
            email: `${promptData.author}@example.com`,
            username: promptData.author.replace(/\s/g, '').toLowerCase(),
          },
        });
      }

      const tags = await Promise.all(
        promptData.tags.map((tagName) =>
          prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          })
        )
      );

      const prompt = await prisma.prompt.create({
        data: {
          title: promptData.title,
          description: promptData.description,
          content: promptData.prompt,
          userId: user.id,
          tags: {
            connect: tags.map((tag: Tag) => ({ id: tag.id })),
          },
        },
      });

      await prisma.sharedPrompt.create({
        data: {
          promptId: prompt.id,
          authorId: user.id,
          title: prompt.title,
          description: prompt.description,
          content: prompt.content ?? '',
          isPublished: true,
          visibility: 'PUBLIC',
          status: 'APPROVED',
          publishedAt: new Date(),
        },
      });

      console.log(`✅ Created and published prompt: ${prompt.title}`);
    } catch (error) {
      console.error(
        `❌ Error creating prompt ${promptData.title}:`,
        error
      );
    }
  }

  console.log(
    `🎉 Successfully seeded ${promptsData.length} marketplace prompts.`
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });