"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { searchPrompts } from "@/app/actions/prompt.actions";
import { PromptList } from "@/components/prompts/prompt-list";
import type { PromptGridItem } from "@/components/prompts/prompt-grid";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [prompts, setPrompts] = useState<PromptGridItem[]>([]);

  useEffect(() => {
    const fetchPrompts = async () => {
      const fetchedPrompts = await searchPrompts(query);
      setPrompts(fetchedPrompts as PromptGridItem[]);
    };
    fetchPrompts();
  }, [query]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">
        {'Search Results for "'}
        {query}
        {'"'}
      </h1>
      <PromptList prompts={prompts} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search results...</div>}>
      <SearchContent />
    </Suspense>
  );
}