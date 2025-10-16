"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateTeamMemberRole, removeTeamMember } from "@/app/actions/team-members.actions";
import { TeamRole } from "@/generated/prisma";
// import { canPerformAction } from "@/app/actions/team.actions";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  MoreVertical, 
  Shield, 
  UserX,
  Mail,
  Clock,
  ChevronLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
}

interface TeamMembersViewProps {
  team: Team;
  members: TeamMember[];
  invitations: Invitation[];
  currentUserId: string;
  currentUserRole: TeamRole;
}

export function TeamMembersView({
  team,
  members,
  invitations,
  currentUserId,
  currentUserRole,
}: TeamMembersViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  
  const isAdmin = currentUserRole === TeamRole.ADMIN || currentUserRole === TeamRole.OWNER;
  const isOwner = currentUserRole === TeamRole.OWNER;

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    setUpdatingRoleId(memberId);
    
    try {
      await updateTeamMemberRole({
        teamId: team.id,
        memberId,
        newRole,
      });
      
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully",
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMember({
        teamId: team.id,
        memberId,
      });
      
      toast({
        title: "Member removed",
        description: "Member has been removed from the team",
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default";
      case "ADMIN":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/teams/${team.id}`)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Manage members of {team.name}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push(`/teams/${team.id}/members/invite`)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
          {isAdmin && invitations.length > 0 && (
            <TabsTrigger value="invitations">
              Pending Invitations ({invitations.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Active Members</CardTitle>
              <CardDescription>
                People who have access to this team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  const memberRole = member.role as TeamRole;
                  
                  return (
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
                          <p className="font-medium">
                            {member.user.name || member.user.username}
                            {isSelf && <span className="text-muted-foreground ml-2">(You)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                        
                        {(isAdmin || isSelf) && memberRole !== TeamRole.OWNER && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={updatingRoleId === member.id}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isOwner && !isSelf && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, TeamRole.ADMIN)}
                                    disabled={memberRole === TeamRole.ADMIN}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, TeamRole.MEMBER)}
                                    disabled={memberRole === TeamRole.MEMBER}
                                  >
                                    Make Member
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, TeamRole.VIEWER)}
                                    disabled={memberRole === TeamRole.VIEWER}
                                  >
                                    Make Viewer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => setRemovingMemberId(member.id)}
                                className="text-destructive"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                {isSelf ? "Leave Team" : "Remove from Team"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && invitations.length > 0 && (
          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>
                  People who have been invited but haven&apos;t joined yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited by {invitation.invitedBy.name || invitation.invitedBy.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{invitation.role}</Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={!!removingMemberId} onOpenChange={() => setRemovingMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {members.find(m => m.id === removingMemberId)?.userId === currentUserId
                ? "Leave Team"
                : "Remove Member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {members.find(m => m.id === removingMemberId)?.userId === currentUserId
                ? "Are you sure you want to leave this team? You&apos;ll lose access to all team prompts."
                : "Are you sure you want to remove this member from the team? They will lose access to all team prompts."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingMemberId && handleRemoveMember(removingMemberId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {members.find(m => m.id === removingMemberId)?.userId === currentUserId
                ? "Leave Team"
                : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}