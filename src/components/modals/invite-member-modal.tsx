"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useModal } from "@/hooks/use-modal-store";
import { inviteTeamMember } from "@/app/actions/team-members.actions";
import { TeamRole } from "@/generated/prisma";
import { X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmailChip {
  email: string;
}

type RoleOption = "ADMIN" | "MEMBER" | "VIEWER";

interface RoleCard {
  role: RoleOption;
  label: string;
  description: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: "ADMIN",
    label: "Admin",
    description: "Can manage members, roles, and all team content.",
  },
  {
    role: "MEMBER",
    label: "Editor",
    description: "Can create, edit, and share prompts in the team.",
  },
  {
    role: "VIEWER",
    label: "Viewer",
    description: "Can view and copy prompts but cannot edit.",
  },
];

export function InviteMemberModal() {
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "inviteMember";

  const [chips, setChips] = useState<EmailChip[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleOption>("MEMBER");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isModalOpen) return null;

  const {
    teamId,
    teamName,
    seatsAvailable,
    seatsTotal,
  } = data.inviteMember ?? {};

  const seatsUsed = seatsTotal !== undefined && seatsAvailable !== undefined
    ? seatsTotal - seatsAvailable
    : undefined;

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const addChip = (value: string) => {
    const email = value.trim();
    if (!email) return;
    if (!isValidEmail(email)) {
      toast.error(`"${email}" is not a valid email address`);
      return;
    }
    if (chips.find((c) => c.email === email)) {
      toast.error("Email already added");
      return;
    }
    setChips((prev) => [...prev, { email }]);
    setInputValue("");
  };

  const removeChip = (email: string) => {
    setChips((prev) => prev.filter((c) => c.email !== email));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(inputValue);
    } else if (e.key === "Backspace" && !inputValue && chips.length > 0) {
      removeChip(chips[chips.length - 1].email);
    }
  };

  const handleSendInvites = async () => {
    if (!teamId || chips.length === 0) return;
    setIsLoading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const chip of chips) {
      try {
        await inviteTeamMember({
          teamId,
          email: chip.email,
          role: selectedRole as TeamRole,
        });
        successCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${chip.email}: ${message}`);
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} invite${successCount !== 1 ? "s" : ""} sent successfully`
      );
    }
    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
    }

    if (errors.length === 0) {
      setChips([]);
      onClose();
    }
  };

  const getInitials = (email: string) => {
    const name = email.split("@")[0];
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50 bg-[rgba(15,17,22,0.55)]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[470px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-line-200 bg-surface-card shadow-[0_20px_60px_-12px_rgba(27,29,34,0.3)]"
        role="dialog"
        aria-modal="true"
        aria-label="Invite members"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line-200">
          <div>
            <h2 className="text-[15px] font-[660] tracking-[-0.015em] text-ink-900">
              Invite members
            </h2>
            <p className="text-[12px] text-ink-400 mt-0.5">
              {teamName ?? "Team"}
              {seatsAvailable !== undefined && seatsTotal !== undefined && (
                <> &middot; {seatsAvailable} of {seatsTotal} seats available</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-[7px] text-ink-400 hover:text-ink-700 hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Email addresses section */}
          <div>
            <span className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 block mb-2">
              Email addresses
            </span>

            {/* Chip input */}
            <div
              className="min-h-[80px] rounded-[9px] border border-line-200 bg-surface-muted p-2.5 flex flex-wrap gap-1.5 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              {chips.map((chip) => (
                <span
                  key={chip.email}
                  className="inline-flex items-center gap-1.5 bg-surface-card border border-line-200 rounded-full pl-1.5 pr-1 py-0.5 text-[12px] text-ink-700"
                >
                  <span className="w-4 h-4 rounded-full bg-accent-100 flex items-center justify-center text-[8px] font-[600] text-accent-700 shrink-0">
                    {getInitials(chip.email)}
                  </span>
                  {chip.email}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChip(chip.email);
                    }}
                    className="text-ink-400 hover:text-ink-700 transition-colors ml-0.5"
                    aria-label={`Remove ${chip.email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (inputValue) addChip(inputValue);
                }}
                placeholder={chips.length === 0 ? "Type an email and press Enter…" : ""}
                className="flex-1 min-w-[180px] bg-transparent outline-none text-[12px] text-ink-700 placeholder:text-ink-400"
              />
            </div>
            <p className="text-[11px] text-ink-400 mt-1.5">
              Press Enter or comma to add each email address.
            </p>
          </div>

          {/* Assign role section */}
          <div>
            <span className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 block mb-2">
              Assign role
            </span>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_CARDS.map(({ role, label, description }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-[9px] border p-3 text-left transition-all",
                    selectedRole === role
                      ? "border-[1.5px] border-accent-500 bg-[#F7F8FE]"
                      : "border border-line-200 bg-surface-card hover:border-line-150"
                  )}
                >
                  <span
                    className={cn(
                      "text-[12px] font-[620]",
                      selectedRole === role ? "text-accent-700" : "text-ink-900"
                    )}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] leading-[1.4] text-ink-400">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-line-200">
          <span className="text-[12px] text-ink-400 tabular-nums">
            {chips.length} invite{chips.length !== 1 ? "s" : ""}
            {seatsUsed !== undefined && (
              <> &middot; {seatsUsed} seats used</>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-[7px] border border-line-200 px-3.5 py-2 text-[13px] font-[550] text-ink-700 hover:border-line-150 hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendInvites}
              disabled={isLoading || chips.length === 0}
              className="inline-flex items-center gap-1.5 rounded-[7px] bg-accent-500 px-4 py-2 text-[13px] font-[550] text-white hover:bg-accent-500/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isLoading ? "Sending…" : "Send invites"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
