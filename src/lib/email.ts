import { Resend } from 'resend';
import { logger } from "@/lib/logger";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'PromptForge <noreply@promptforge.dev>';

interface SendInvitationEmailParams {
  to: string;
  teamName: string;
  inviterName: string;
  invitationUrl: string;
  role: string;
}

interface SendPasswordResetParams {
  to: string;
  resetUrl: string;
  userName?: string;
}

interface SendWelcomeEmailParams {
  to: string;
  userName: string;
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail(params: SendInvitationEmailParams) {
  const { to, teamName, inviterName, invitationUrl, role } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6379c3 0%, #546ee5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .button { display: inline-block; padding: 12px 24px; background: #546ee5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Team Invitation</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on PromptForge as a <strong>${role.toLowerCase()}</strong>.</p>
            <p>Join your team to collaborate on prompts, share knowledge, and work together more effectively.</p>
            <p style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </p>
            <p><small>This invitation will expire in 7 days.</small></p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>PromptForge - AI Prompt Management Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    if (resend) {
      // Send actual email in production
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `You've been invited to join ${teamName} on PromptForge`,
        html: emailHtml,
      });

      logger.info("Team invitation email sent", {
        to,
        teamName,
        messageId: result.data?.id
      });

      return { success: true, messageId: result.data?.id };
    } else {
      // Development mode - log to console
      logger.info("Team invitation email (development mode)", {
        to,
        teamName,
        invitationUrl,
        subject: `You've been invited to join ${teamName} on PromptForge`
      });

      return { success: true, dev: true };
    }
  } catch (error) {
    logger.error("Failed to send team invitation email", { error, to, teamName });
    throw new Error('Failed to send invitation email');
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(params: SendPasswordResetParams) {
  const { to, resetUrl, userName } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6379c3 0%, #546ee5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .button { display: inline-block; padding: 12px 24px; background: #546ee5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>We received a request to reset your password for your PromptForge account.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p><small>This link will expire in 1 hour.</small></p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>PromptForge - AI Prompt Management Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    if (resend) {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Reset your PromptForge password',
        html: emailHtml,
      });

      logger.info("Password reset email sent", { to, messageId: result.data?.id });
      return { success: true, messageId: result.data?.id };
    } else {
      logger.info("Password reset email (development mode)", { to, resetUrl });
      return { success: true, dev: true };
    }
  } catch (error) {
    logger.error("Failed to send password reset email", { error, to });
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(params: SendWelcomeEmailParams) {
  const { to, userName } = params;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6379c3 0%, #546ee5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to PromptForge!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Welcome to PromptForge! We're excited to have you on board.</p>
            <p>Here are some things you can do to get started:</p>
            <ul>
              <li>Create your first prompt</li>
              <li>Organize prompts with folders and tags</li>
              <li>Explore the shared prompts marketplace</li>
              <li>Create or join a team for collaboration</li>
            </ul>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>PromptForge - AI Prompt Management Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    if (resend) {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: 'Welcome to PromptForge!',
        html: emailHtml,
      });

      logger.info("Welcome email sent", { to, messageId: result.data?.id });
      return { success: true, messageId: result.data?.id };
    } else {
      logger.info("Welcome email (development mode)", { to });
      return { success: true, dev: true };
    }
  } catch (error) {
    logger.error("Failed to send welcome email", { error, to });
    // Don't throw - welcome email failure shouldn't block registration
    return { success: false, error };
  }
}