import { Suspense } from "react";
import { getFavoritePrompts } from "@/app/actions/prompt-favorites.actions";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { Star } from "lucide-react";

async function FavoritesList() {
  const favorites = await getFavoritePrompts();

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Star className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Start favoriting prompts to quickly access them here
        </p>
      </div>
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
  );
}