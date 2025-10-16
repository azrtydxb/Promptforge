#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Helper to make HTTPS POST requests
function httpsPost(url, data, authToken) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${authToken}`,
      },
      timeout: 60000,
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: JSON.parse(responseData),
        });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Main upload process
async function uploadCursorRules() {
  const authToken = process.env.NEXT_AUTH_SESSION_TOKEN;
  if (!authToken) {
    console.error('Error: NEXT_AUTH_SESSION_TOKEN environment variable not set');
    console.log('\nTo get your session token:');
    console.log('1. Login to https://promptforge.directory as pascal@watteel.com');
    console.log('2. Open browser DevTools > Application > Cookies');
    console.log('3. Find "next-auth.session-token" cookie');
    console.log('4. Run: export NEXT_AUTH_SESSION_TOKEN="<token_value>"');
    process.exit(1);
  }

  const extractedFile = path.join(__dirname, 'cursor-rules-extracted.json');
  if (!fs.existsSync(extractedFile)) {
    console.error(`Error: ${extractedFile} not found`);
    console.log('Run: npm run extract-cursor-rules (first)');
    process.exit(1);
  }

  const prompts = JSON.parse(fs.readFileSync(extractedFile, 'utf-8'));
  console.log(`Loading ${prompts.length} prompts from extracted file...\n`);

  // Batch upload in chunks to avoid overwhelming the server
  const batchSize = 50;
  let uploadedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(prompts.length / batchSize)} (${batch.length} prompts)...`);

    try {
      const response = await httpsPost(
        'https://promptforge.directory/api/prompts/cursor-batch-upload',
        { prompts: batch },
        authToken
      );

      if (response.statusCode === 200 && response.data.success) {
        uploadedCount += response.data.successCount;
        errorCount += response.data.errorCount;
        console.log(`  ✓ Uploaded ${response.data.successCount} prompts (${response.data.errorCount} errors)`);

        if (response.data.errors && response.data.errors.length > 0) {
          response.data.errors.slice(0, 3).forEach(err => {
            console.log(`    - ${err.title}: ${err.error}`);
          });
          if (response.data.errors.length > 3) {
            console.log(`    ... and ${response.data.errors.length - 3} more errors`);
          }
        }
      } else {
        console.error(`  ✗ Upload failed: ${response.data.error || 'Unknown error'}`);
        errorCount += batch.length;
      }
    } catch (error) {
      console.error(`  ✗ Batch upload error: ${error.message}`);
      errorCount += batch.length;
    }

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✓ Upload complete!`);
  console.log(`  Total uploaded: ${uploadedCount}`);
  console.log(`  Total errors: ${errorCount}`);
  console.log(`  Success rate: ${((uploadedCount / prompts.length) * 100).toFixed(1)}%`);
}

// Main execution
async function main() {
  try {
    await uploadCursorRules();
  } catch (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }
}

main();
