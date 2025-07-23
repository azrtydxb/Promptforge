import { Suspense } from "react";
import { AdvancedSearch } from "@/components/search/advanced-search";
import { PageErrorBoundary } from "@/components/error-boundary";

export default function SearchPage() {
  return (
    <PageErrorBoundary>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Advanced Search</h1>
            <p className="text-muted-foreground mt-2">
              Use AI-powered semantic search to find prompts by meaning, not just keywords
            </p>
          </div>
          
          <Suspense fallback={<div>Loading search...</div>}>
            <AdvancedSearch />
          </Suspense>
        </div>
      </div>
    </PageErrorBoundary>
  );
}