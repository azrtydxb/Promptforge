import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvitationStatus } from "@/generated/prisma";
import { AcceptInvitationView } from "@/components/teams/accept-invitation-view";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface AcceptInvitationPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
  const user = await requireAuth();
  const { token } = await params;
  
  const invitation = await db.teamInvitation.findUnique({
    where: { token },
    include: {
      team: true,
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  
  if (!invitation) {
    notFound();
  }
  
  // Check if invitation is still valid
  const isExpired = new Date() > invitation.expiresAt;
  const isUsed = invitation.status !== InvitationStatus.PENDING;
  const isForDifferentUser = invitation.email !== user.email;
  
  // Transform invitation to match component expectations
  const transformedInvitation = {
    ...invitation,
    team: {
      ...invitation.team,
      description: invitation.team.description ?? undefined,
      logo: invitation.team.logo ?? undefined,
    },
    invitedBy: {
      ...invitation.invitedBy,
      email: invitation.invitedBy.email || '',
    },
  };

  return (
    <div className="container max-w-2xl py-16">
      <AcceptInvitationView
        invitation={transformedInvitation}
        isExpired={isExpired}
        isUsed={isUsed}
        isForDifferentUser={isForDifferentUser}
        userEmail={user.email || ""}
      />
    </div>
  );
}