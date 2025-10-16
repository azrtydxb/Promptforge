#!/usr/bin/env node

const https = require('https');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Helper to make HTTPS requests
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Helper to extract prompts from HTML
function extractPromptsFromHtml(html, category) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const prompts = [];
    const codeBlocks = doc.querySelectorAll('code');

    codeBlocks.forEach((codeBlock) => {
      const content = codeBlock.textContent?.trim();
      if (content && content.length > 50) {
        const parent = codeBlock.closest('a[href*="/"]');
        const href = parent?.getAttribute('href') || '';
        const title = href.split('/').pop() || category;

        prompts.push({
          title: title.replace(/[-_]/g, ' ').replace(/^\w/, c => c.toUpperCase()),
          description: `Cursor AI rule for ${category}`,
          content: content,
          tags: [category, 'cursor', 'ai-rule'],
        });
      }
    });

    return prompts;
  } catch (error) {
    console.error(`Error extracting prompts from ${category}:`, error.message);
    return [];
  }
}

// Main extraction process
async function extractAllRules() {
  console.log('Starting extraction of Cursor Directory rules...\n');

  const categories = [
    'typescript', 'python', 'javascript', 'react', 'next.js', 'node.js',
    'php', 'java', 'go', 'rust', 'swift', 'kotlin',
    'laravel', 'fastapi', 'django', 'nestjs', 'rails', 'flask',
    'tailwindcss', 'vue', 'angular', 'svelte', 'astro', 'remix',
    'prisma', 'graphql', 'api', 'testing', 'devops', 'docker'
  ];

  let allPrompts = [];

  for (const category of categories) {
    try {
      console.log(`Fetching rules for: ${category}...`);
      const url = `https://cursor.directory/rules/${category}`;
      const html = await httpsGet(url);
      const prompts = extractPromptsFromHtml(html, category);

      console.log(`  ✓ Found ${prompts.length} prompts`);
      allPrompts = allPrompts.concat(prompts);
    } catch (error) {
      console.error(`  ✗ Failed to fetch ${category}:`, error.message);
    }
  }

  console.log(`\n✓ Extracted ${allPrompts.length} total prompts\n`);

  // Save to file for review
  const outputFile = path.join(__dirname, 'cursor-rules-extracted.json');
  fs.writeFileSync(outputFile, JSON.stringify(allPrompts, null, 2));
  console.log(`Saved extracted data to: ${outputFile}`);

  return allPrompts;
}

// Main execution
async function main() {
  try {
    const prompts = await extractAllRules();
    console.log(`\nExtraction complete! Ready to upload ${prompts.length} prompts.`);
    console.log('Run: npm run upload-cursor-rules');
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  }
}

main();
