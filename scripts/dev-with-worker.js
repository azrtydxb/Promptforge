#!/usr/bin/env node

const { spawn } = require('child_process');

// Try to use chalk if available, otherwise use plain console
let chalk;
try {
  chalk = require('chalk');
} catch (e) {
  // Chalk not installed, create a mock
  chalk = {
    blue: (str) => str,
    green: (str) => str,
    yellow: (str) => str,
    red: (str) => str
  };
}

console.log(chalk.blue('🚀 Starting PromptForge with worker process...'));

// Start the Next.js dev server
const nextProcess = spawn('npx', ['next', 'dev', '--turbopack'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

// Wait a bit for the server to start, then start the worker
setTimeout(() => {
  console.log(chalk.green('\n📦 Starting embedding worker...'));
  
  const workerProcess = spawn('npm', ['run', 'worker'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  });
  
  workerProcess.on('error', (error) => {
    console.error(chalk.red(`Worker error: ${error.message}`));
  });
  
  workerProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(chalk.red(`Worker exited with code ${code}`));
    }
  });
}, 5000);

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Shutting down...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n🛑 Shutting down...'));
  process.exit(0);
});

nextProcess.on('error', (error) => {
  console.error(chalk.red(`Next.js error: ${error.message}`));
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(chalk.red(`Next.js exited with code ${code}`));
  }
  process.exit(code);
});