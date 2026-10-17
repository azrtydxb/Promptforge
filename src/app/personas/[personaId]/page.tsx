import { notFound } from "next/navigation";
import { getPersonaById } from "@/app/actions/persona.actions";
import { PersonaForm } from "@/components/personas/persona-form";
import { PersonaEditorTopbar } from "../topbar";

export const dynamic = "force-dynamic";

interface PersonaDetailPageProps {
  params: Promise<{ personaId: string }>;
}

export default async function PersonaDetailPage({
  params,
}: PersonaDetailPageProps) {
  const { personaId } = await params;
  const persona = await getPersonaById(personaId);

  if (!persona) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PersonaEditorTopbar name={persona.name} />
      <div className="mx-auto max-w-[760px]">
        <PersonaForm mode="edit" persona={persona} />
      </div>
    </div>
  );
}
