"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AvatarRoot as Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { acceptTeamInvitation, declineTeamInvitation } from "@/app/actions/team-members.actions";
import { useToast } from "@/hooks/use-toast";
import { Building2, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InvitationType {
  token: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  team: {
    id: string;
    name: string;
    description?: string;
    logo?: string;
  };
  invitedBy: {
    name: string | null;
    email: string;
  };
}

interface AcceptInvitationViewProps {
  invitation: InvitationType;
  isExpired: boolean;
  isUsed: boolean;
  isForDifferentUser: boolean;
  userEmail: string;
}

export function AcceptInvitationView({
  invitation,
  isExpired,
  isUsed,
  isForDifferentUser,
  userEmail,
}: AcceptInvitationViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<"accept" | "decline" | null>(null);

  const handleAccept = async () => {
    setIsProcessing(true);
    setAction("accept");
    
    try {
      const result = await acceptTeamInvitation(invitation.token);
      if (result.success) {
        toast({
          title: "Welcome to the team!",
          description: `You've successfully joined ${invitation.team.name}`,
        });
        router.push(`/teams/${invitation.team.id}`);
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invitation",
        variant: "destructive",
      });
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    setAction("decline");
    
    try {
      const result = await declineTeamInvitation(invitation.token);
      if (result.success) {
        toast({
          title: "Invitation declined",
          description: "You've declined the team invitation",
        });
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decline invitation",
        variant: "destructive",
      });
      setIsProcessing(false);
      setAction(null);
    }
  };

  // Show error states
  if (isForDifferentUser) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <CardTitle>Invalid Invitation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This invitation was sent to {invitation.email}, but you&apos;re signed in as {userEmail}.
              Please sign in with the correct account to accept this invitation.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isExpired) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <CardTitle>Invitation Expired</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This invitation has expired. Please contact {invitation.invitedBy.name || "the team admin"} to request a new invitation.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isUsed) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5" />
            <CardTitle>Invitation Already Used</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This invitation has already been {invitation.status.toLowerCase()}.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Team Invitation</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join a team on PromptForge
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {invitation.team.logo && (
              <AvatarImage
                src={invitation.team.logo}
                alt={invitation.team.name}
              />
            )}
            <AvatarFallback className="text-2xl">
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{invitation.team.name}</h3>
            {invitation.team.description && (
              <p className="text-sm text-muted-foreground">{invitation.team.description}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Invited by</span>
            <span className="font-medium">{invitation.invitedBy.name || invitation.invitedBy.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your role</span>
            <Badge variant="secondary">{invitation.role}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Expires</span>
            <span className="text-sm">
              {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            By accepting this invitation, you&apos;ll be able to access and collaborate on prompts shared within this team.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing && action === "accept" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Accept Invitation
        </Button>
        <Button
          variant="outline"
          onClick={handleDecline}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing && action === "decline" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Decline
        </Button>
      </CardFooter>
    </Card>
  );
}