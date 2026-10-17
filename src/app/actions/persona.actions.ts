"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export interface PersonaInput {
  name: string;
  role?: string | null;
  description?: string | null;
  tone?: string | null;
  systemPrompt: string;
  model?: string | null;
  temperature?: number | null;
  tags?: string[];
}

/** Trim, drop blanks, and de-duplicate tag names. */
function normalizeTags(tags?: string[]): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function normalizeTemperature(value?: number | null): number | null {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  return Math.min(2, Math.max(0, value));
}

/** List the current user's agent personas, most recently updated first. */
export async function getPersonas() {
  const user = await requireAuth();
  return db.agentPersona.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
}

/** Fetch one persona, scoped to the current user (ownership enforced). */
export async function getPersonaById(personaId: string) {
  const user = await requireAuth();
  return db.agentPersona.findFirst({
    where: { id: personaId, userId: user.id },
  });
}

export async function createPersona(input: PersonaInput) {
  const user = await requireAuth();

  const name = input.name?.trim();
  const systemPrompt = input.systemPrompt?.trim();
  if (!name) throw new Error("Name is required");
  if (!systemPrompt) throw new Error("System prompt is required");

  try {
    const persona = await db.agentPersona.create({
      data: {
        userId: user.id,
        name,
        role: input.role?.trim() || null,
        description: input.description?.trim() || null,
        tone: input.tone?.trim() || null,
        systemPrompt,
        model: input.model?.trim() || null,
        temperature: normalizeTemperature(input.temperature),
        tags: normalizeTags(input.tags),
      },
    });

    logger.info("Agent persona created", { personaId: persona.id, userId: user.id });
    revalidatePath("/personas");
    return persona;
  } catch (_error) {
    logger.error("Error creating agent persona", _error);
    throw _error;
  }
}

export async function updatePersona(personaId: string, input: PersonaInput) {
  const user = await requireAuth();

  const existing = await db.agentPersona.findFirst({
    where: { id: personaId, userId: user.id },
    select: { id: true },
  });
  if (!existing) throw new Error("Persona not found or unauthorized");

  const name = input.name?.trim();
  const systemPrompt = input.systemPrompt?.trim();
  if (!name) throw new Error("Name is required");
  if (!systemPrompt) throw new Error("System prompt is required");

  try {
    const persona = await db.agentPersona.update({
      where: { id: personaId },
      data: {
        name,
        role: input.role?.trim() || null,
        description: input.description?.trim() || null,
        tone: input.tone?.trim() || null,
        systemPrompt,
        model: input.model?.trim() || null,
        temperature: normalizeTemperature(input.temperature),
        tags: normalizeTags(input.tags),
      },
    });

    logger.info("Agent persona updated", { personaId, userId: user.id });
    revalidatePath("/personas");
    revalidatePath(`/personas/${personaId}`);
    return persona;
  } catch (_error) {
    logger.error("Error updating agent persona", _error);
    throw _error;
  }
}

export async function deletePersona(personaId: string) {
  const user = await requireAuth();

  const existing = await db.agentPersona.findFirst({
    where: { id: personaId, userId: user.id },
    select: { id: true },
  });
  if (!existing) throw new Error("Persona not found or unauthorized");

  try {
    await db.agentPersona.delete({ where: { id: personaId } });
    logger.info("Agent persona deleted", { personaId, userId: user.id });
    revalidatePath("/personas");
    return { success: true };
  } catch (_error) {
    logger.error("Error deleting agent persona", _error);
    throw _error;
  }
}
