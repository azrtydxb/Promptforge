import { requireAuth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCollection } from "@/app/actions/collections.actions";
import { CollectionDetailView } from "@/components/collections/collection-detail-view";

export const metadata = {
  title: "Collection | PromptForge",
};

interface CollectionPageProps {
  params: Promise<{
    collectionId: string;
  }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  try {
    const user = await requireAuth();
    const { collectionId } = await params;

    const result = await getCollection(collectionId);

    if (!result.success || !result.collection) {
      notFound();
    }

    const isOwner = result.collection.userId === user.id;

    return (
      <div className="container mx-auto py-6">
        <CollectionDetailView
          collection={result.collection}
          isOwner={isOwner}
        />
      </div>
    );
  } catch (error) {
    // User not authenticated
    redirect("/login");
  }
}
