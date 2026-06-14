"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTeamMemberRole, removeTeamMember, inviteTeamMember } from "@/app/actions/team-members.actions";
import { TeamRole } from "@/generated/prisma";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Role select for active members
// ---------------------------------------------------------------------------

const ROLE_DISPLAY: Record<string, string> = {
  ADMIN: "Admin",
  MEMBER: "Editor",
  VIEWER: "Viewer",
};

interface RoleSelectProps {
  teamId: string;
  memberId: string;
  currentRole: string;
  canChangeRole: boolean;
}

export function RoleSelect({ teamId, memberId, currentRole, canChangeRole }: RoleSelectProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(currentRole);

  if (!canChangeRole) {
    return (
      <span className="text-[13px] text-ink-700">
        {ROLE_DISPLAY[currentRole] ?? currentRole}
      </span>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as TeamRole;
    setValue(newRole);
    startTransition(async () => {
      try {
        await updateTeamMemberRole({ teamId, memberId, newRole });
        toast.success("Role updated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update role");
        setValue(currentRole);
      }
    });
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={pending}
      className="rounded-[7px] border border-line-200 bg-surface-card text-[13px] text-ink-700 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:opacity-50"
    >
      <option value="ADMIN">Admin</option>
      <option value="MEMBER">Editor</option>
      <option value="VIEWER">Viewer</option>
    </select>
  );
}

// ---------------------------------------------------------------------------
// Remove member button
// ---------------------------------------------------------------------------

interface RemoveButtonProps {
  teamId: string;
  memberId: string;
  isSelf: boolean;
  memberName: string;
}

export function RemoveButton({ teamId, memberId, isSelf, memberName }: RemoveButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="border border-danger/30 text-danger rounded-[7px] px-2 py-1 text-[12px] hover:bg-danger-surface transition-colors"
      >
        {isSelf ? "Leave" : "Remove"}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <span className="text-[12px] text-ink-600">Sure?</span>
      <button
        onClick={() => {
          startTransition(async () => {
            try {
              await removeTeamMember({ teamId, memberId });
              toast.success(isSelf ? "You left the team" : `${memberName} removed`);
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to remove");
            }
          });
          setConfirming(false);
        }}
        disabled={pending}
        className="border border-danger/30 text-danger rounded-[7px] px-2 py-1 text-[12px] hover:bg-danger-surface transition-colors disabled:opacity-50"
      >
        Yes
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="border border-line-200 text-ink-600 rounded-[7px] px-2 py-1 text-[12px] hover:bg-surface-muted transition-colors"
      >
        No
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Resend invite button (re-sends invitation to same email)
// ---------------------------------------------------------------------------

interface ResendButtonProps {
  teamId: string;
  email: string;
  role: string;
}

export function ResendButton({ teamId, email, role }: ResendButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleResend = () => {
    startTransition(async () => {
      try {
        await inviteTeamMember({ teamId, email, role: role as TeamRole });
        toast.success(`Invitation resent to ${email}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to resend invite");
      }
    });
  };

  return (
    <button
      onClick={handleResend}
      disabled={pending}
      className="border border-line-200 text-ink-700 rounded-[7px] px-2 py-1 text-[12px] hover:bg-surface-muted transition-colors disabled:opacity-50"
    >
      {pending ? "Sending…" : "Resend"}
    </button>
  );
}
