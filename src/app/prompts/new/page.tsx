import PromptPage from "../[promptId]/page";

export default function NewPromptPage() {
  return <PromptPage params={Promise.resolve({ promptId: "new" })} />;
}