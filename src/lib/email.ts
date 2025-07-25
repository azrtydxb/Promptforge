import { logger } from "@/lib/logger";

interface SendInvitationEmailParams {
  to: string;
  teamName: string;
  inviterName: string;
  invitationUrl: string;
  role: string;
}

export async function sendTeamInvitationEmail(params: SendInvitationEmailParams) {
  const { to, teamName, inviterName, invitationUrl, role } = params;
  
  // In production, this would use a service like SendGrid, AWS SES, or Resend
  // For now, we'll just log the email details
  
  const emailContent = `
    Subject: You've been invited to join ${teamName} on PromptForge
    
    Hi there,
    
    ${inviterName} has invited you to join ${teamName} on PromptForge as a ${role.toLowerCase()}.
    
    Click the link below to accept the invitation:
    ${invitationUrl}
    
    This invitation will expire in 7 days.
    
    Best regards,
    The PromptForge Team
  `;
  
  logger.info("Team invitation email (development mode)", {
    to,
    teamName,
    invitationUrl,
    emailContent,
  });
  
  // TODO: Implement actual email sending
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: "PromptForge <noreply@promptforge.dev>",
  //   to,
  //   subject: `You've been invited to join ${teamName} on PromptForge`,
  //   html: emailHtml,
  // });
  
  return true;
}