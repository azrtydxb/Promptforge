import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserCollections, getPublicCollections } from "@/app/actions/collections.actions";
import { CollectionsView } from "@/components/collections/collections-view";

export const metadata = {
  title: "Collections | PromptForge",
  description: "Manage your prompt collections",
};

export default async function CollectionsPage() {
  try {
    const user = await requireAuth();

    // Get user's collections and public collections in parallel
    const [userResult, publicResult] = await Promise.all([
      getUserCollections(),
      getPublicCollections(),
    ]);

    const userCollections = userResult.success ? (userResult.collections || []) : [];
    const publicCollections = publicResult.success ? (publicResult.collections || []) : [];

    return (
      <div className="container mx-auto py-6 space-y-8">
        <CollectionsView
          userCollections={userCollections}
          publicCollections={publicCollections}
          userId={user.id}
        />
      </div>
    );
  } catch (error) {
    // User not authenticated
    redirect("/login");
  }
}
