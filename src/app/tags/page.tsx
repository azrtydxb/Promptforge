import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { TagsManagement } from "@/components/tags/tags-management";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

// Internal function for getting tags data (not cached)
async function getTagsDataInternal() {
  const tags = await db.tag.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          prompts: true
        }
      },
      // Prompts under this tag that are published to the Prompt Market — drives the
      // "Shared" column (prototype shows a real per-tag shared count).
      prompts: {
        where: { sharedPrompt: { isNot: null } },
        select: { id: true },
      },
    },
    orderBy: {
      name: 'asc'
    }
  });

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    createdAt: t.createdAt,
    _count: { prompts: t._count.prompts },
    sharedCount: t.prompts.length,
  }));
}

// Cached version of getTagsData
const getTagsData = unstable_cache(
  async () => {
    return getTagsDataInternal();
  },
  ['tags-page-data'],
  {
    tags: ['tags', 'tags-page'],
    revalidate: 300, // 5 minutes
  }
);

export default async function TagsPage() {
  const tags = await getTagsData();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Tags Management</h1>
      <Card>
        <CardContent>
          <Suspense fallback={<div>Loading tags...</div>}>
            <TagsManagement initialTags={tags} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}