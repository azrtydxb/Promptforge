"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { 
  Check, 
  ChevronDown, 
  Plus, 
  Settings, 
  Users,
  Building2,
  User
} from "lucide-react";
import { getUserTeams } from "@/app/actions/team.actions";
import { getTeamContext, setTeamContext } from "@/app/actions/team-context.actions";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  members: Array<{
    role: string;
  }>;
  _count: {
    members: number;
    prompts: number;
  };
}

interface TeamSwitcherProps {
  className?: string;
}

export function TeamSwitcher({ className }: TeamSwitcherProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadTeamsAndContext();
  }, []);

  const loadTeamsAndContext = async () => {
    try {
      const [userTeams, context] = await Promise.all([
        getUserTeams(),
        getTeamContext(),
      ]);
      
      setTeams(userTeams as Team[]);
      setCurrentTeamId(context.teamId);
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSwitch = async (teamId: string | null) => {
    try {
      await setTeamContext(teamId);
      setCurrentTeamId(teamId);
      setOpen(false);
      
      // Refresh the page to reload with new context
      router.refresh();
      
      toast({
        title: "Context switched",
        description: teamId 
          ? `Switched to team context` 
          : "Switched to personal workspace",
      });
    } catch (error) {
      console.error("Error switching team:", error);
      toast({
        title: "Error",
        description: "Failed to switch context",
        variant: "destructive",
      });
    }
  };

  const currentTeam = teams.find(t => t.id === currentTeamId);
  const userRole = currentTeam?.members[0]?.role;

  if (loading) {
    return (
      <div className={cn("w-[200px] h-10 bg-gray-100 animate-pulse rounded", className)} />
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[200px] justify-between",
            className
          )}
        >
          <div className="flex items-center gap-2">
            {currentTeam ? (
              <>
                <Avatar 
                  user={{
                    id: currentTeam.id,
                    name: currentTeam.name,
                    email: null,
                    username: null,
                    avatarType: 'INITIALS' as const,
                    profilePicture: currentTeam.logo,
                    gravatarEmail: null
                  }}
                  size="sm"
                  className="h-5 w-5"
                />
                <span className="truncate">{currentTeam.name}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>Personal Workspace</span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

        {/* Personal Workspace */}
        <DropdownMenuItem
          onClick={() => handleTeamSwitch(null)}
          className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
        >
          <User className="mr-2 h-4 w-4" />
          <span className="flex-1">Personal Workspace</span>
          {!currentTeamId && <Check className="h-4 w-4 text-[#546ee5]" />}
        </DropdownMenuItem>

        {teams.length > 0 && <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />}

        {/* Team Workspaces */}
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamSwitch(team.id)}
            className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
          >
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
              size="sm"
              className="mr-2 h-4 w-4"
            />
            <div className="flex-1 overflow-hidden">
              <div className="truncate">{team.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {team._count.members} members · {team._count.prompts} prompts
              </div>
            </div>
            {currentTeamId === team.id && <Check className="h-4 w-4 text-[#546ee5]" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

        {/* Current team actions */}
        {currentTeam && (
          <>
            <DropdownMenuItem
              onClick={() => router.push(`/teams/${currentTeam.slug}`)}
              className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Team Dashboard</span>
            </DropdownMenuItem>

            {(userRole === "OWNER" || userRole === "ADMIN") && (
              <DropdownMenuItem
                onClick={() => router.push(`/teams/${currentTeam.slug}/settings`)}
                className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Team Settings</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
          </>
        )}

        {/* Create new team */}
        <DropdownMenuItem
          onClick={() => router.push("/teams/new")}
          className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Create Team</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}