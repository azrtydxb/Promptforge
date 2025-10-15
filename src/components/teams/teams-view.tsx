"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Users, 
  FileText, 
  Calendar, 
  Shield, 
  ShieldCheck, 
  User, 
  Eye,
  Plus,
  ArrowRight,
  Building2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  memberCount: number;
  promptCount: number;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    username: string | null;
  };
  isOwner: boolean;
}

interface TeamsViewProps {
  data: {
    teams: Team[];
    totalTeams: number;
  };
}

const roleIcons = {
  OWNER: Shield,
  ADMIN: ShieldCheck,
  MEMBER: User,
  VIEWER: Eye,
};

const roleColors = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
} as const;

export function TeamsView({ data }: TeamsViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = () => {
    setLoading(true);
    router.push('/teams/new');
  };

  const handleTeamClick = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  if (!data || data.teams.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Teams</h1>
          <p className="text-muted-foreground mt-2">Collaborate with others by creating or joining teams</p>
        </div>
        
        <EmptyState
          type="noData"
          icon={Building2}
          title="No teams yet"
          description="Join a team or create your own to start collaborating on prompts"
          actions={[
            {
              label: "Create New Team",
              onClick: handleCreateTeam,
              variant: "primary"
            }
          ]}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Teams</h1>
          <p className="text-muted-foreground mt-2">
            You&apos;re a member of {data.totalTeams} {data.totalTeams === 1 ? 'team' : 'teams'}
          </p>
        </div>
        <Button onClick={handleCreateTeam} disabled={loading} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Create New Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.teams.map((team) => {
          const RoleIcon = roleIcons[team.role];
          
          return (
            <Card 
              key={team.id} 
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => handleTeamClick(team.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-[hsl(var(--primary))] transition-colors">
                      {team.name}
                    </CardTitle>
                    {team.description && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {team.description}
                      </CardDescription>
                    )}
                  </div>
                  {team.logo && (
                    <Image 
                      src={team.logo} 
                      alt={`${team.name} logo`}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover"
                    />
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{team.promptCount} {team.promptCount === 1 ? 'prompt' : 'prompts'}</span>
                    </div>
                  </div>
                  
                  {/* Role Badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant={roleColors[team.role]} className="gap-1">
                      <RoleIcon className="w-3 h-3" />
                      {team.role}
                    </Badge>
                  </div>
                  
                  {/* Joined Date */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Joined {formatDistanceToNow(new Date(team.joinedAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-4">
                <Button 
                  variant="ghost" 
                  className="w-full group-hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTeamClick(team.id);
                  }}
                >
                  View Team
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Optional: Add pagination if needed in the future */}
    </div>
  );
}