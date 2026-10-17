"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check, Save, Trash2, Bot } from "lucide-react";
import {
  createPersona,
  updatePersona,
  deletePersona,
} from "@/app/actions/persona.actions";
import { cn } from "@/lib/utils";

export interface PersonaFormValues {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  tone: string | null;
  systemPrompt: string;
  model: string | null;
  temperature: number | null;
  tags: string[];
}

const TONE_OPTIONS = [
  "Neutral",
  "Concise",
  "Friendly",
  "Formal",
  "Playful",
  "Direct",
];

const FIELD_CLASS =
  "w-full rounded-[9px] border border-line-200 bg-surface-card px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-300 outline-none transition-colors focus:border-accent-500";
const LABEL_CLASS =
  "block text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mb-1.5";

export function PersonaForm({
  mode,
  persona,
}: {
  mode: "create" | "edit";
  persona?: PersonaFormValues;
}) {
  const router = useRouter();

  const [name, setName] = useState(persona?.name ?? "");
  const [role, setRole] = useState(persona?.role ?? "");
  const [tone, setTone] = useState(persona?.tone ?? "");
  const [description, setDescription] = useState(persona?.description ?? "");
  const [model, setModel] = useState(persona?.model ?? "");
  const [temperature, setTemperature] = useState(
    persona?.temperature !== null && persona?.temperature !== undefined
      ? String(persona.temperature)
      : ""
  );
  const [tags, setTags] = useState((persona?.tags ?? []).join(", "));
  const [systemPrompt, setSystemPrompt] = useState(persona?.systemPrompt ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildInput = () => ({
    name,
    role,
    description,
    tone,
    systemPrompt,
    model,
    temperature: temperature.trim() === "" ? null : Number(temperature),
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!systemPrompt.trim()) {
      toast.error("System prompt is required");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "create") {
        const created = await createPersona(buildInput());
        toast.success("Persona created");
        router.push(`/personas/${created.id}`);
      } else if (persona) {
        await updatePersona(persona.id, buildInput());
        toast.success("Persona saved");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save persona");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!persona) return;
    if (!window.confirm("Delete this persona? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deletePersona(persona.id);
      toast.success("Persona deleted");
      router.push("/personas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete persona");
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(systemPrompt);
      setCopied(true);
      toast.success("System prompt copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Identity */}
      <div className="rounded-[11px] border border-line-200 bg-surface-card p-[18px]">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent-100 text-accent-500">
            <Bot className="h-4 w-4" />
          </span>
          <h2 className="text-[14px] font-[620] tracking-[-0.01em] text-ink-900">
            Persona
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="persona-name">
              Name
            </label>
            <input
              id="persona-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Code Reviewer"
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="persona-role">
              Role
            </label>
            <input
              id="persona-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Staff Engineer"
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={LABEL_CLASS} htmlFor="persona-description">
            Description
          </label>
          <textarea
            id="persona-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What is this persona for?"
            className={cn(FIELD_CLASS, "resize-y leading-relaxed")}
          />
        </div>
      </div>

      {/* Behaviour */}
      <div className="rounded-[11px] border border-line-200 bg-surface-card p-[18px]">
        <h2 className="mb-4 text-[14px] font-[620] tracking-[-0.01em] text-ink-900">
          Behaviour
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="persona-tone">
              Tone
            </label>
            <input
              id="persona-tone"
              list="persona-tone-options"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. Concise, direct"
              className={FIELD_CLASS}
            />
            <datalist id="persona-tone-options">
              {TONE_OPTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="persona-model">
              Model
            </label>
            <input
              id="persona-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. claude-sonnet-4"
              className={cn(FIELD_CLASS, "font-mono text-[12px]")}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="persona-temperature">
              Temperature
            </label>
            <input
              id="persona-temperature"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="0.7"
              className={cn(FIELD_CLASS, "tabular-nums")}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={LABEL_CLASS} htmlFor="persona-tags">
            Tags
          </label>
          <input
            id="persona-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma separated, e.g. code, review"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      {/* System prompt */}
      <div className="rounded-[11px] border border-line-200 bg-surface-card p-[18px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-[620] tracking-[-0.01em] text-ink-900">
            System prompt
          </h2>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[12px] font-[550] text-accent-700 transition-colors hover:text-accent-500"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={10}
          placeholder="You are a…"
          className={cn(
            FIELD_CLASS,
            "resize-y bg-surface-muted font-mono text-[12px] leading-[1.65]"
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-[7px] border border-[#F0D6D8] px-3.5 py-2 text-[13px] font-[550] text-danger transition-colors hover:bg-[#F0D6D8]/40 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-[7px] bg-accent-500 px-4 py-2 text-[13px] font-[550] text-white transition-colors hover:bg-[#4F5AC4] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving
            ? "Saving…"
            : mode === "create"
              ? "Create persona"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
