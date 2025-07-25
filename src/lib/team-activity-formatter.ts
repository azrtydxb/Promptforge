import { TeamAction } from "@/generated/prisma";

export function formatActivityMessage(activity: any): string {
  const userName = activity.user?.name || activity.user?.username || "Someone";
  
  switch (activity.action) {
    case TeamAction.TEAM_CREATED:
      return `${userName} created the team`;
    case TeamAction.TEAM_UPDATED:
      return `${userName} updated team settings`;
    case TeamAction.MEMBER_INVITED:
      return `${userName} invited ${activity.metadata?.email} to join`;
    case TeamAction.MEMBER_JOINED:
      return `${userName} joined the team`;
    case TeamAction.MEMBER_LEFT:
      return `${userName} left the team`;
    case TeamAction.MEMBER_REMOVED:
      return `${userName} removed ${activity.entityName} from the team`;
    case TeamAction.MEMBER_ROLE_CHANGED:
      return `${userName} changed ${activity.entityName}'s role to ${activity.metadata?.newRole}`;
    case TeamAction.PROMPT_CREATED:
      return `${userName} created prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_UPDATED:
      return `${userName} updated prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_DELETED:
      return `${userName} deleted prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_ARCHIVED:
      return `${userName} archived prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_RESTORED:
      return `${userName} restored prompt "${activity.entityName}"`;
    case TeamAction.FOLDER_CREATED:
      return `${userName} created folder "${activity.entityName}"`;
    case TeamAction.FOLDER_UPDATED:
      return `${userName} updated folder "${activity.entityName}"`;
    case TeamAction.FOLDER_DELETED:
      return `${userName} deleted folder "${activity.entityName}"`;
    case TeamAction.TAG_CREATED:
      return `${userName} created tag "${activity.entityName}"`;
    case TeamAction.TAG_UPDATED:
      return `${userName} updated tag "${activity.entityName}"`;
    case TeamAction.TAG_DELETED:
      return `${userName} deleted tag "${activity.entityName}"`;
    default:
      return `${userName} performed an action`;
  }
}