import { Suspense } from "react";
import { AdvancedSearch } from "@/components/search/advanced-search";
import { PageErrorBoundary } from "@/components/error-boundary";

export default function SearchPage() {
  return (
    <PageErrorBoundary>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div>Loading search...</div>}>
            <AdvancedSearch />
          </Suspense>
        </div>
      </div>
    </PageErrorBoundary>
  );
}