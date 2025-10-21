import { getSharedPromptCached as getSharedPrompt } from "@/app/actions/shared-prompts.actions.cached";
import { SharedPromptDetail } from "@/components/marketplace/shared-prompt-detail";
import { notFound } from "next/navigation";

export default async function SharedPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSharedPrompt(id);

  if (!result.success || !result.prompt) {
    notFound();
  }

  return <SharedPromptDetail sharedPrompt={result.prompt as unknown as Parameters<typeof SharedPromptDetail>[0]['sharedPrompt']} />;
}