import { Suspense } from "react";
import { PromptsSearchPage } from "@/components/search/prompts-search-page";
import { PageErrorBoundary } from "@/components/error-boundary";

export default function SearchPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<div>Loading search...</div>}>
        <PromptsSearchPage />
      </Suspense>
    </PageErrorBoundary>
  );
}