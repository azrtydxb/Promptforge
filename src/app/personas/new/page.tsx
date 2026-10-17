"use client";

import { PersonaForm } from "@/components/personas/persona-form";
import { PersonaNewTopbar } from "../topbar";

export default function NewPersonaPage() {
  return (
    <div className="space-y-6">
      <PersonaNewTopbar />
      <div className="mx-auto max-w-[760px]">
        <PersonaForm mode="create" />
      </div>
    </div>
  );
}
