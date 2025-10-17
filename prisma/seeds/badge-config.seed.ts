import { PrismaClient, ConfigCategory } from '../../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Badge Configuration Seed Data
 *
 * Migrates hardcoded badge configurations from BadgeDisplay component
 * to database for easy customization without code changes.
 */

const badgeConfigurations = [
  {
    key: 'badge.CREATOR',
    category: 'BADGE' as ConfigCategory,
    value: {
      icon: '✨',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      description: 'Creative and prolific prompt creator',
    },
    description: 'Badge configuration for Creator badge',
  },
  {
    key: 'badge.POPULAR',
    category: 'BADGE' as ConfigCategory,
    value: {
      icon: '🌟',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      description: 'Popular content creator with high engagement',
    },
    description: 'Badge configuration for Popular badge',
  },
  {
    key: 'badge.HELPFUL',
    category: 'BADGE' as ConfigCategory,
    value: {
      icon: '💝',
      color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      description: 'Helpful community member',
    },
    description: 'Badge configuration for Helpful badge',
  },
  {
    key: 'badge.VERIFIED',
    category: 'BADGE' as ConfigCategory,
    value: {
      icon: '✓',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      description: 'Verified account',
    },
    description: 'Badge configuration for Verified badge',
  },
  {
    key: 'badge.MODERATOR',
    category: 'BADGE' as ConfigCategory,
    value: {
      icon: '🛡️',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      description: 'Community moderator',
    },
    description: 'Badge configuration for Moderator badge',
  },
  {
    key: 'badge.EARLY_ADOPTER',
    category: 'BADGE' as ConfigCategory,
    value: {
      icon: '🚀',
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      description: 'Early adopter of the platform',
    },
    description: 'Badge configuration for Early Adopter badge',
  },
  {
    key: 'badge.DEFAULT',
    category: 'BADGE' as ConfigCategory,
    value: {
      icon: '🏆',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      description: 'Default badge',
    },
    description: 'Default badge configuration for unknown badge types',
  },
];

/**
 * Additional configuration examples
 */
const additionalConfigurations = [
  {
    key: 'feature.maxFileSize',
    category: 'FEATURE' as ConfigCategory,
    value: {
      size: 10485760, // 10MB in bytes
      unit: 'MB',
      display: '10 MB',
    },
    description: 'Maximum file upload size',
  },
  {
    key: 'feature.maxPromptsPerUser',
    category: 'FEATURE' as ConfigCategory,
    value: {
      free: 100,
      pro: 1000,
      enterprise: -1, // unlimited
    },
    description: 'Maximum prompts per user by tier',
  },
  {
    key: 'ui.theme.primary',
    category: 'UI' as ConfigCategory,
    value: {
      light: '#007bff',
      dark: '#0056b3',
    },
    description: 'Primary theme color',
  },
];

export async function seedBadgeConfig() {
  console.log('🌱 Seeding badge configurations...');

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const config of badgeConfigurations) {
    try {
      const existing = await prisma.appConfig.findUnique({
        where: { key: config.key },
      });

      if (existing) {
        await prisma.appConfig.update({
          where: { key: config.key },
          data: {
            value: config.value,
            description: config.description,
          },
        });
        updated++;
        console.log(`✅ Updated: ${config.key}`);
      } else {
        await prisma.appConfig.create({
          data: config,
        });
        created++;
        console.log(`✨ Created: ${config.key}`);
      }
    } catch (error) {
      failed++;
      console.error(`❌ Failed to seed ${config.key}:`, error);
    }
  }

  console.log('\n📊 Badge Configuration Seed Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);

  return { created, updated, failed };
}

export async function seedAdditionalConfig() {
  console.log('\n🌱 Seeding additional configurations...');

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const config of additionalConfigurations) {
    try {
      const existing = await prisma.appConfig.findUnique({
        where: { key: config.key },
      });

      if (existing) {
        await prisma.appConfig.update({
          where: { key: config.key },
          data: {
            value: config.value,
            description: config.description,
          },
        });
        updated++;
        console.log(`✅ Updated: ${config.key}`);
      } else {
        await prisma.appConfig.create({
          data: config,
        });
        created++;
        console.log(`✨ Created: ${config.key}`);
      }
    } catch (error) {
      failed++;
      console.error(`❌ Failed to seed ${config.key}:`, error);
    }
  }

  console.log('\n📊 Additional Configuration Seed Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);

  return { created, updated, failed };
}

// Main seed function
async function main() {
  try {
    await seedBadgeConfig();
    await seedAdditionalConfig();

    console.log('\n✅ Configuration seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default main;
