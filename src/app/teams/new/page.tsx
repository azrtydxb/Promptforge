import { CreateTeamForm } from "@/components/teams/create-team-form";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function NewTeamPage() {
  const user = await requireAuth();
  
  if (!user) {
    redirect("/sign-in");
  }
  
  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create a New Team</h1>
        <p className="text-muted-foreground mt-2">
          Teams allow you to collaborate with others and share prompts within your organization.
        </p>
      </div>
      
      <CreateTeamForm />
    </div>
  );
}