"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatActivityMessage } from "@/lib/team-activity-formatter";
import { formatDistanceToNow } from "date-fns";
import { 
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  FileText,
  Settings,
  UserPlus,
  UserMinus,
  Shield,
  Edit,
  Trash,
  Plus
} from "lucide-react";
import type { Team, TeamActivity } from "@/generated/prisma";

interface ActivityUser {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  avatarType: string;
  profilePicture: string | null;
}

interface TeamActivityViewProps {
  team: Team;
  activities: Array<TeamActivity & {
    user: ActivityUser;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentUserId: string;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TEAM_CREATED: Plus,
  TEAM_UPDATED: Edit,
  TEAM_DELETED: Trash,
  MEMBER_ADDED: UserPlus,
  MEMBER_INVITED: UserPlus,
  MEMBER_JOINED: UserPlus,
  MEMBER_LEFT: UserMinus,
  MEMBER_REMOVED: UserMinus,
  MEMBER_ROLE_CHANGED: Shield,
  PROMPT_ADDED: FileText,
  PROMPT_REMOVED: FileText,
  FOLDER_CREATED: FileText,
  FOLDER_UPDATED: FileText,
  FOLDER_DELETED: FileText,
  TAG_CREATED: FileText,
  TAG_UPDATED: FileText,
  TAG_DELETED: FileText,
  SETTINGS_UPDATED: Settings,
};

export function TeamActivityView({
  team,
  activities,
  pagination,
}: TeamActivityViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`/teams/${team.id}/activity?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{team.name} Activity</h1>
          <p className="text-muted-foreground mt-1">
            View all team activity and changes
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/teams/${team.id}`}>
            <Users className="h-4 w-4 mr-2" />
            Back to Team
          </Link>
        </Button>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            Recent actions and changes in your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = ACTION_ICONS[activity.action] || Activity;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Avatar
                          user={{
                            id: activity.user.id,
                            name: activity.user.name,
                            username: activity.user.username,
                            email: activity.user.email,
                            avatarType: activity.user.avatarType as "INITIALS" | "GRAVATAR" | "UPLOAD",
                            profilePicture: activity.user.profilePicture,
                          }}
                          size="sm"
                        />
                        <span className="font-medium">
                          {activity.user.name || activity.user.username || "Unknown User"}
                        </span>
                        <span className="text-muted-foreground">
                          {formatActivityMessage({
                            user: activity.user,
                            action: activity.action,
                            entityName: activity.entityName,
                            metadata: activity.metadata as Record<string, unknown> | undefined,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} activities
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}