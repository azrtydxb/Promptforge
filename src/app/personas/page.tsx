import { Suspense } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { getPersonas } from "@/app/actions/persona.actions";
import { PersonaCard } from "@/components/personas/persona-card";
import { PersonasTopbar } from "./topbar";

export const dynamic = "force-dynamic";

function EmptyPersonas() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[11px] border border-dashed border-line-200 bg-surface-card py-24 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-accent-100 text-accent-500">
        <Bot className="h-5 w-5" />
      </span>
      <p className="mt-3 text-[15px] font-[600] text-ink-900">
        No personas yet
      </p>
      <p className="mt-1 max-w-[380px] text-[13px] text-ink-400">
        Create your first agent persona to define a reusable role, tone and
        system prompt.
      </p>
      <Link
        href="/personas/new"
        className="mt-4 rounded-[7px] bg-accent-500 px-4 py-2 text-[13px] font-[550] text-white transition-colors hover:bg-[#4F5AC4]"
      >
        New persona
      </Link>
    </div>
  );
}

async function PersonaList() {
  const personas = await getPersonas();

  if (personas.length === 0) {
    return (
      <>
        <PersonasTopbar count={0} />
        <EmptyPersonas />
      </>
    );
  }

  return (
    <>
      <PersonasTopbar count={personas.length} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>
    </>
  );
}

export default function PersonasPage() {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-[11px] bg-line-100"
              />
            ))}
          </div>
        }
      >
        <PersonaList />
      </Suspense>
    </div>
  );
}
