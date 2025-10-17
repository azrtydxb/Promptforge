import { PerformanceMonitor } from '@/lib/performance';

/**
 * Seed performance dashboard with sample metrics
 * This helps verify the dashboard is working even before real usage
 */
export function seedPerformanceMetrics() {
  // Only seed in development
  if (process.env.NODE_ENV !== 'development') return;

  console.log('🌱 Seeding performance metrics for dashboard testing...');

  // Simulate some typical operations with realistic timings
  const sampleOperations = [
    { name: 'action:getFolders', durations: [45, 52, 48, 55, 51] },
    { name: 'action:searchPrompts', durations: [125, 148, 132, 145, 138] },
    { name: 'action:togglePromptFavorite', durations: [62, 58, 65, 59, 61] },
    { name: 'database:getAllPrompts', durations: [178, 165, 182, 171, 175] },
    { name: 'cache:trendingPrompts', durations: [95, 102, 98, 105, 100] },
    { name: 'api:health', durations: [8, 9, 7, 10, 9] },
  ];

  sampleOperations.forEach(({ name, durations }) => {
    durations.forEach(duration => {
      // Directly record metric without actual execution
      (PerformanceMonitor as any).recordMetric(name, duration);
    });
  });

  console.log('✅ Performance metrics seeded successfully');
  console.log(`📊 Dashboard now has ${sampleOperations.length} operations with sample data`);
}
