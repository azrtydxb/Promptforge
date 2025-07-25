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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
                <Avatar className="h-5 w-5">
                  <AvatarImage src={currentTeam.logo || undefined} />
                  <AvatarFallback className="text-xs">
                    <Building2 className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
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
      <DropdownMenuContent className="w-[200px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Personal Workspace */}
        <DropdownMenuItem
          onClick={() => handleTeamSwitch(null)}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span className="flex-1">Personal Workspace</span>
          {!currentTeamId && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        {teams.length > 0 && <DropdownMenuSeparator />}
        
        {/* Team Workspaces */}
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamSwitch(team.id)}
            className="cursor-pointer"
          >
            <Avatar className="mr-2 h-4 w-4">
              <AvatarImage src={team.logo || undefined} />
              <AvatarFallback className="text-xs">
                <Building2 className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="truncate">{team.name}</div>
              <div className="text-xs text-muted-foreground">
                {team._count.members} members · {team._count.prompts} prompts
              </div>
            </div>
            {currentTeamId === team.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Current team actions */}
        {currentTeam && (
          <>
            <DropdownMenuItem
              onClick={() => router.push(`/teams/${currentTeam.slug}`)}
              className="cursor-pointer"
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Team Dashboard</span>
            </DropdownMenuItem>
            
            {(userRole === "OWNER" || userRole === "ADMIN") && (
              <DropdownMenuItem
                onClick={() => router.push(`/teams/${currentTeam.slug}/settings`)}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Team Settings</span>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Create new team */}
        <DropdownMenuItem
          onClick={() => router.push("/teams/new")}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Create Team</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}