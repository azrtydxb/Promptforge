import { db } from '@/lib/db';
import { ModerationAction, ModerationSeverity } from '@/generated/prisma';
import { logger } from '@/lib/logger';

interface ModerationResult {
  isAllowed: boolean;
  severity?: ModerationSeverity;
  action?: ModerationAction;
  reason?: string;
  ruleId?: string;
}

interface ContentToModerate {
  title?: string;
  content: string;
  description?: string;
}

// Default moderation rules - these will be seeded into the database
const DEFAULT_MODERATION_RULES = [
  // Explicit content
  {
    name: 'Explicit Sexual Content',
    pattern: '\\b(sex|sexual|porn|pornography|masturbat|orgasm|nude|naked|nsfw)\\b',
    severity: 'HIGH' as ModerationSeverity,
    action: 'REJECT' as ModerationAction,
    description: 'Detects explicit sexual content'
  },
  // Violence and harmful content
  {
    name: 'Violence and Harm',
    pattern: '\\b(kill|murder|suicide|self.?harm|violence|weapon|bomb|terrorist)\\b',
    severity: 'CRITICAL' as ModerationSeverity,
    action: 'REJECT' as ModerationAction,
    description: 'Detects violent or harmful content'
  },
  // Hate speech
  {
    name: 'Hate Speech',
    pattern: '\\b(hate|racist|nazi|fascist|bigot|slur)\\b',
    severity: 'HIGH' as ModerationSeverity,
    action: 'REJECT' as ModerationAction,
    description: 'Detects hate speech and discriminatory language'
  },
  // Personal information
  {
    name: 'Personal Information',
    pattern: '\\b(\\d{3}[-.]?\\d{3}[-.]?\\d{4}|\\d{3}[-.]?\\d{2}[-.]?\\d{4}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})\\b',
    severity: 'MEDIUM' as ModerationSeverity,
    action: 'FLAG' as ModerationAction,
    description: 'Detects phone numbers, SSNs, and email addresses'
  },
  // Spam indicators
  {
    name: 'Spam Content',
    pattern: '\\b(buy.now|click.here|limited.time|act.fast|guaranteed|100%.free|make.money)\\b',
    severity: 'MEDIUM' as ModerationSeverity,
    action: 'REQUIRE_REVIEW' as ModerationAction,
    description: 'Detects common spam phrases'
  },
  // Financial scams
  {
    name: 'Financial Scams',
    pattern: '\\b(bitcoin|cryptocurrency|investment.opportunity|get.rich|ponzi|pyramid.scheme)\\b',
    severity: 'HIGH' as ModerationSeverity,
    action: 'BLOCK' as ModerationAction,
    description: 'Detects potential financial scams'
  },
  // Copyright infringement
  {
    name: 'Copyright Content',
    pattern: '\\b(copyright|copyrighted|©|trademark|™|proprietary.code)\\b',
    severity: 'MEDIUM' as ModerationSeverity,
    action: 'FLAG' as ModerationAction,
    description: 'Flags potential copyright issues'
  },
  // Quality control - very short content
  {
    name: 'Low Quality Content',
    pattern: '^.{1,10}$',
    severity: 'LOW' as ModerationSeverity,
    action: 'REQUIRE_REVIEW' as ModerationAction,
    description: 'Flags very short content that may be low quality'
  }
];

/**
 * Initialize default moderation rules in the database
 */
export async function initializeModerationRules() {
  try {
    for (const rule of DEFAULT_MODERATION_RULES) {
      await db.moderationRule.upsert({
        where: { name: rule.name },
        update: {
          pattern: rule.pattern,
          severity: rule.severity,
          action: rule.action,
          description: rule.description,
          isActive: true
        },
        create: rule
      });
    }
    logger.info('Moderation rules initialized successfully');
  } catch (error) {
    logger.error('Error initializing moderation rules', error);
    throw error;
  }
}

/**
 * Moderate content against all active rules
 */
export async function moderateContent(content: ContentToModerate): Promise<ModerationResult> {
  try {
    // Get all active moderation rules
    const rules = await db.moderationRule.findMany({
      where: { isActive: true },
      orderBy: { severity: 'desc' } // Check most severe rules first
    });

    // Combine all text content for checking
    const textToCheck = [
      content.title || '',
      content.content || '',
      content.description || ''
    ].join(' ').toLowerCase();

    // Check against each rule
    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'gi');
      
      if (regex.test(textToCheck)) {
        // Log the moderation action
        await logModerationAction('prompt', 'pending', rule.id, rule.action, `Matched rule: ${rule.name}`);
        
        return {
          isAllowed: rule.action === 'FLAG' || rule.action === 'REQUIRE_REVIEW',
          severity: rule.severity,
          action: rule.action,
          reason: rule.description || `Content flagged by rule: ${rule.name}`,
          ruleId: rule.id
        };
      }
    }

    // If no rules matched, content is allowed
    return {
      isAllowed: true
    };

  } catch (error) {
    logger.error('Error during content moderation', error);
    // In case of error, err on the side of caution
    return {
      isAllowed: false,
      severity: 'MEDIUM',
      action: 'REQUIRE_REVIEW',
      reason: 'Moderation system error - requires manual review'
    };
  }
}

/**
 * Log moderation actions for auditing
 */
export async function logModerationAction(
  contentType: string,
  contentId: string,
  ruleId: string | null,
  action: ModerationAction,
  reason?: string,
  automated: boolean = true,
  reviewedBy?: string
) {
  try {
    await db.moderationLog.create({
      data: {
        contentType,
        contentId,
        ruleId,
        action,
        reason,
        automated,
        reviewedBy
      }
    });
  } catch (error) {
    logger.error('Error logging moderation action', error, { contentType, contentId, action });
  }
}

/**
 * Perform additional quality checks
 */
export function performQualityChecks(content: ContentToModerate): {
  isQuality: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check minimum content length
  if (!content.content || content.content.trim().length < 20) {
    issues.push('Content is too short to be useful');
  }

  // Check for proper sentence structure
  if (content.content && !content.content.includes('.') && !content.content.includes('?') && !content.content.includes('!')) {
    issues.push('Content should include proper punctuation');
  }

  // Check for excessive capitalization
  const upperCaseRatio = (content.content?.match(/[A-Z]/g) || []).length / content.content?.length || 0;
  if (upperCaseRatio > 0.5 && content.content && content.content.length > 10) {
    issues.push('Excessive use of capital letters');
  }

  // Check for repetitive content
  if (content.content) {
    const words = content.content.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;
    
    if (wordCount > 10 && uniqueWords / wordCount < 0.3) {
      issues.push('Content appears to be repetitive');
    }
  }

  return {
    isQuality: issues.length === 0,
    issues
  };
}

/**
 * Combined moderation check including both content filtering and quality
 */
export async function fullModerationCheck(content: ContentToModerate): Promise<{
  isApproved: boolean;
  moderationResult: ModerationResult;
  qualityCheck: { isQuality: boolean; issues: string[] };
}> {
  const [moderationResult, qualityCheck] = await Promise.all([
    moderateContent(content),
    Promise.resolve(performQualityChecks(content))
  ]);

  const isApproved = moderationResult.isAllowed && qualityCheck.isQuality;

  return {
    isApproved,
    moderationResult,
    qualityCheck
  };
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const stats = await db.moderationLog.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: since
        }
      },
      _count: {
        action: true
      }
    });

    return stats.reduce((acc, stat) => {
      acc[stat.action] = stat._count.action;
      return acc;
    }, {} as Record<ModerationAction, number>);
  } catch (error) {
    logger.error('Error getting moderation stats', error, { days });
    return {};
  }
}