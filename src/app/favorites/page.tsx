import { Suspense } from "react";
import { getFavoritePrompts } from "@/app/actions/prompt-favorites.actions";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { EmptyState } from "@/components/ui/empty-state";
import { Star } from "lucide-react";

async function FavoritesList() {
  const favorites = await getFavoritePrompts();

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Star}
        type="noData"
        title="No favorites yet"
        description="Start favoriting prompts by clicking the star icon to quickly access them here. Your favorite prompts will appear in this collection for easy reference."
        size="lg"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
      {favorites.map((prompt) => (
        <UnifiedPromptCard
          key={prompt.id}
          variant="personal"
          data={prompt}
        />
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Favorite Prompts</h1>
        <p className="text-muted-foreground mt-1">Your collection of favorite prompts for quick access</p>
      </div>
      
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <FavoritesList />
      </Suspense>
    </div>
  );
}