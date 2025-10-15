"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { 
  Users, 
  FileText, 
  Activity, 
  Settings,
  Plus,
  UserPlus,
  TrendingUp,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatActivityMessage } from "@/lib/team-activity-formatter";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TeamDashboardProps {
  team: any;
  activitySummary: any;
  currentUserId: string;
}

export function TeamDashboard({ team, activitySummary, currentUserId }: TeamDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  
  const currentMember = team.members.find((m: any) => m.userId === currentUserId);
  const userRole = currentMember?.role;
  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar 
            user={{
              id: team.id,
              name: team.name,
              email: null,
              username: null,
              avatarType: 'INITIALS' as const,
              profilePicture: team.logo,
              gravatarEmail: null
            }}
            size="2xl"
          />
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            {team.description && (
              <p className="text-muted-foreground mt-1">{team.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {team._count.members} members
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {team._count.prompts} prompts
              </span>
            </div>
          </div>
        </div>
        
        {isAdmin && (
          <Button
            onClick={() => router.push(`/teams/${team.id}/settings`)}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Team Settings
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Prompts
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{team._count.prompts}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{team._count.members}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recent Activity
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(Object.values(activitySummary.activityCounts).reduce((a: any, b: any) => a + b, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Most Active
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {activitySummary.activeUsers[0] ? (
                  <>
                    <div className="text-2xl font-bold">
                      {activitySummary.activeUsers[0].user?.name || "Unknown"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activitySummary.activeUsers[0].activityCount} actions
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No activity yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest team actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activitySummary.recentActivity.length > 0 ? (
                  activitySummary.recentActivity.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <Avatar 
                        user={{
                          id: activity.user?.id || 'unknown',
                          name: activity.user?.name,
                          email: activity.user?.email,
                          username: activity.user?.username,
                          avatarType: 'INITIALS' as const,
                          profilePicture: activity.user?.image,
                          gravatarEmail: activity.user?.email
                        }}
                        size="sm"
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">
                          {formatActivityMessage(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Prompts</CardTitle>
                  <CardDescription>Prompts shared within this team</CardDescription>
                </div>
                <Button onClick={() => router.push(`/teams/${team.id}/prompts/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Prompt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Link 
                href={`/teams/${team.id}/prompts`}
                className="text-primary hover:underline"
              >
                View all team prompts →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>People in this team</CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => router.push(`/teams/${team.id}/members/invite`)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team.members.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        user={{
                          id: member.user.id,
                          name: member.user.name,
                          email: member.user.email,
                          username: member.user.username,
                          avatarType: 'INITIALS' as const,
                          profilePicture: member.user.image,
                          gravatarEmail: member.user.email
                        }}
                        size="md"
                      />
                      <div>
                        <p className="font-medium">{member.user.name || member.user.username}</p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
              {isAdmin && (
                <Link 
                  href={`/teams/${team.id}/members`}
                  className="text-primary hover:underline mt-4 inline-block"
                >
                  Manage all members →
                </Link>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>Full activity log for this team</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href={`/teams/${team.id}/activity`}
                className="text-primary hover:underline"
              >
                View full activity log →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}