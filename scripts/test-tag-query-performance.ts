/**
 * Performance test script for getAvailableSharedPromptTags optimization
 * This script measures the query execution time to verify the performance improvement
 *
 * Run with: npx tsx scripts/test-tag-query-performance.ts
 */

import { db } from '../src/lib/db';

async function testOptimizedQuery() {
  console.log('Testing optimized tag query performance...\n');

  const iterations = 5;
  const times: number[] = [];

  for (let i = 1; i <= iterations; i++) {
    const startTime = performance.now();

    const result = await db.$queryRaw<Array<{ id: string; name: string; count: bigint }>>`
      SELECT
        t.id,
        t.name,
        COUNT(DISTINCT pt."A") as count
      FROM "Tag" t
      INNER JOIN "_PromptToTag" pt ON t.id = pt."B"
      INNER JOIN "Prompt" p ON pt."A" = p.id
      INNER JOIN "SharedPrompt" sp ON p.id = sp."promptId"
      WHERE sp."isPublished" = true AND sp.status = 'APPROVED'
      GROUP BY t.id, t.name
      ORDER BY count DESC
    `;

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    times.push(executionTime);

    console.log(`Iteration ${i}: ${executionTime.toFixed(2)}ms - Found ${result.length} tags`);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log('\n--- Performance Summary ---');
  console.log(`Average: ${avgTime.toFixed(2)}ms`);
  console.log(`Min: ${minTime.toFixed(2)}ms`);
  console.log(`Max: ${maxTime.toFixed(2)}ms`);
  console.log(`\nExpected improvement: ~32,900ms → ~${avgTime.toFixed(2)}ms`);
  console.log(`Performance gain: ~${(32900 / avgTime).toFixed(0)}x faster`);
}

async function main() {
  try {
    await testOptimizedQuery();
  } catch (error) {
    console.error('Error testing query:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
