import { getSharedPrompt } from "@/app/actions/shared-prompts.actions";
import { SharedPromptDetail } from "@/components/marketplace/shared-prompt-detail";
import { notFound } from "next/navigation";

export default async function SharedPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSharedPrompt(id);

  if (!result.success || !result.sharedPrompt) {
    notFound();
  }

  return <SharedPromptDetail sharedPrompt={result.sharedPrompt} />;
}