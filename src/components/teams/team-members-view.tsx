"use client";

import { useModal } from "@/hooks/use-modal-store";
import { Avatar } from "@/components/ui/avatar";
import { TeamRole } from "@/generated/prisma";
import { formatDistanceToNow } from "date-fns";
import { RoleSelect, RemoveButton, ResendButton } from "./member-row-actions";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle, TopbarNewButton } from "@/components/layout/topbar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt?: Date;
  user: TeamUser;
}

interface InvitedBy {
  name: string | null;
  email: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  invitedBy: InvitedBy;
}

interface Team {
  id: string;
  name: string;
  seatsTotal?: number;
  seatsUsed?: number;
  activeToday?: number;
  _count?: {
    prompts?: number;
    folders?: number;
  };
}

interface TeamMembersViewProps {
  team: Team;
  members: TeamMember[];
  invitations: Invitation[];
  currentUserId: string;
  currentUserRole: TeamRole;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_DISPLAY: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Editor",
  VIEWER: "Viewer",
};

const LABEL_CLASS = "text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400";

function KpiCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-4 first:pl-5 last:pr-5">
      <span className={LABEL_CLASS}>{label}</span>
      <span className="text-[24px] font-[660] tabular-nums text-ink-900 leading-none">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TeamMembersView({
  team,
  members,
  invitations,
  currentUserId,
  currentUserRole,
}: TeamMembersViewProps) {
  const { onOpen } = useModal();

  const isAdmin = currentUserRole === TeamRole.ADMIN || currentUserRole === TeamRole.OWNER;
  const isOwner = currentUserRole === TeamRole.OWNER;

  const promptCount = team._count?.prompts ?? 0;
  const folderCount = team._count?.folders ?? 0;
  const seatsTotal = team.seatsTotal ?? members.length;
  const seatsUsed = team.seatsUsed ?? members.length;
  const activeToday = team.activeToday ?? 0;

  // Team initial for chip
  const teamInitial = team.name.charAt(0).toUpperCase();

  // Order rows: Owner first, then Admin → Editor → Viewer, pending invites last
  // (matches the prototype's "Members & roles" table ordering).
  const ROLE_WEIGHT: Record<string, number> = {
    [TeamRole.OWNER]: 0,
    [TeamRole.ADMIN]: 1,
    [TeamRole.MEMBER]: 2,
    [TeamRole.VIEWER]: 3,
  };
  const sortedMembers = [...members].sort(
    (a, b) => (ROLE_WEIGHT[a.role] ?? 5) - (ROLE_WEIGHT[b.role] ?? 5)
  );
  const allRows = [
    ...sortedMembers.map((m) => ({ type: "member" as const, data: m })),
    ...invitations.map((inv) => ({ type: "invite" as const, data: inv })),
  ];

  return (
    <div className="space-y-5">
      {/* ── Topbar Portal ── */}
      <TopbarPortal>
        <TopbarTitle>Teams</TopbarTitle>
        <span className="flex items-center gap-1.5 rounded-[7px] border border-line-200 bg-surface-card px-2.5 py-1.5 text-[12.5px] font-[550] text-ink-700">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-accent-100 text-[9px] font-[600] text-accent-700">
            {teamInitial}
          </span>
          {team.name}
        </span>
        {isAdmin && (
          <div className="ml-auto">
            <TopbarNewButton
              label="Invite member"
              onClick={() => onOpen("inviteMember", { inviteMember: { teamId: team.id, teamName: team.name } })}
            />
          </div>
        )}
      </TopbarPortal>

      {/* ── KPI Bar ── */}
      <div className="bg-surface-card border border-line-200 rounded-[11px] flex divide-x divide-line-100 overflow-hidden">
        <KpiCell label="Members" value={`${seatsUsed} / ${seatsTotal}`} />
        <KpiCell label="Shared prompts" value={promptCount} />
        <KpiCell label="Team folders" value={folderCount} />
        <KpiCell label="Active today" value={activeToday} />
      </div>

      {/* ── Admin banner ── */}
      {isAdmin && (
        <div className="bg-accent-100 border border-accent-500/20 rounded-[10px] p-3 text-[13px] text-ink-700 leading-snug">
          You&apos;re a <strong>team admin</strong> — you can invite people, change roles and remove
          members. Seats are billed on the team&apos;s plan.
        </div>
      )}

      {/* ── Members & Roles section header ── */}
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[14px] font-[620] text-ink-900">Members &amp; roles</h2>
        <span className="text-[12.5px] text-ink-400">
          {members.length} member{members.length === 1 ? "" : "s"}
          {invitations.length > 0 && ` · ${invitations.length} pending`}
        </span>
      </div>

      {/* ── Members & Roles table ── */}
      <div className="bg-surface-card border border-line-200 rounded-[11px] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_120px_120px_120px] gap-0 px-4 py-2.5 border-b border-line-100">
          <span className={LABEL_CLASS}>Member</span>
          <span className={LABEL_CLASS}>Email</span>
          <span className={LABEL_CLASS}>Role</span>
          <span className={LABEL_CLASS}>Last active</span>
          <span className={LABEL_CLASS}>Manage</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-line-100">
          {allRows.map((row) => {
            if (row.type === "member") {
              const member = row.data as TeamMember;
              const isSelf = member.userId === currentUserId;
              const isOwnerRow = member.role === TeamRole.OWNER;
              const displayName = member.user.name || member.user.username || "Unknown";
              const canManageThis = isAdmin && !isSelf && !isOwnerRow;
              const canChangeRole = isOwner && !isSelf && !isOwnerRow;

              return (
                <div
                  key={member.id}
                  className="grid grid-cols-[1fr_1fr_120px_120px_120px] gap-0 items-center px-4 py-3 hover:bg-surface-muted/50 transition-colors"
                >
                  {/* Member column */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      user={{
                        id: member.user.id,
                        name: member.user.name,
                        email: member.user.email,
                        username: member.user.username,
                        avatarType: "INITIALS" as const,
                        profilePicture: member.user.image,
                        gravatarEmail: member.user.email,
                      }}
                      size="sm"
                      isCurrentUser={isSelf}
                    />
                    <span className="text-[13px] font-[500] text-ink-900 truncate">
                      {displayName}
                      {isSelf && (
                        <span className="text-ink-400 font-[400] ml-1">(You)</span>
                      )}
                    </span>
                  </div>

                  {/* Email */}
                  <span className="text-[13px] text-ink-600 truncate pr-3">
                    {member.user.email ?? "—"}
                  </span>

                  {/* Role */}
                  <div>
                    {isOwnerRow ? (
                      <span className="bg-surface-muted text-ink-600 rounded-full px-2 py-0.5 text-[11px] font-[500]">
                        Owner
                      </span>
                    ) : (
                      <RoleSelect
                        teamId={team.id}
                        memberId={member.id}
                        currentRole={member.role}
                        canChangeRole={canChangeRole}
                      />
                    )}
                  </div>

                  {/* Last active */}
                  <span className="text-[13px] text-ink-400 tabular-nums">
                    {"joinedAt" in member && member.joinedAt
                      ? formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })
                      : "—"}
                  </span>

                  {/* Manage */}
                  <div>
                    {isOwnerRow ? (
                      <span className="text-[13px] text-ink-400">—</span>
                    ) : canManageThis || isSelf ? (
                      <RemoveButton
                        teamId={team.id}
                        memberId={member.id}
                        isSelf={isSelf}
                        memberName={displayName}
                      />
                    ) : (
                      <span className="text-[13px] text-ink-400">—</span>
                    )}
                  </div>
                </div>
              );
            }

            // Pending invitation row
            const inv = row.data as Invitation;
            return (
              <div
                key={inv.id}
                className="grid grid-cols-[1fr_1fr_120px_120px_120px] gap-0 items-center px-4 py-3 hover:bg-surface-muted/50 transition-colors"
              >
                {/* Member column (dashed placeholder) */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-line-200 flex items-center justify-center text-ink-400 text-[10px] shrink-0">
                    ?
                  </div>
                  <span className="text-[13px] font-[500] text-ink-400 truncate">Invited</span>
                </div>

                {/* Email */}
                <span className="text-[13px] text-ink-600 truncate pr-3">{inv.email}</span>

                {/* Role — show as Pending badge */}
                <span className="inline-flex items-center bg-warning-surface text-warning rounded-full px-2 py-0.5 text-[11px] font-[500] w-fit">
                  Pending
                </span>

                {/* Last active */}
                <span className="text-[13px] text-ink-400">—</span>

                {/* Manage */}
                <div>
                  {isAdmin && (
                    <ResendButton teamId={team.id} email={inv.email} role={inv.role} />
                  )}
                </div>
              </div>
            );
          })}

          {allRows.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-ink-400">
              No members found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
