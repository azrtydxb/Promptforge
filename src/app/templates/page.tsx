import { PromptTemplatesContainer } from "@/components/templates/prompt-templates-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Templates | Promptforge",
  description: "Browse and use pre-built prompt templates",
};

export default function TemplatesPage() {
  return <PromptTemplatesContainer />;
}