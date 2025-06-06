#!/usr/bin/env node

const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);

// Show help if no arguments or help flag
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Renovate Reporter - Parse Renovate debug logs and generate HTML reports

Usage:
  npx renovate-reporter <input-file> [output-file]

Arguments:
  input-file    Path to the Renovate NDJSON debug log file
  output-file   Path for the output HTML report (optional, defaults to renovate-report.html)

Options:
  --help, -h    Show this help message
  --version, -v Show version information

Examples:
  npx renovate-reporter renovate.ndjson
  npx renovate-reporter renovate.ndjson my-report.html
`);
  process.exit(0);
}

// Show version
if (args.includes('--version') || args.includes('-v')) {
  const packageJson = require('../package.json');
  console.log(`renovate-reporter v${packageJson.version}`);
  process.exit(0);
}

// Validate input file
const inputFile = args[0];
if (!inputFile) {
  console.error('Error: Input file is required');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file '${inputFile}' not found`);
  process.exit(1);
}

// Set output file (default or provided)
const outputFile = args[1] || 'renovate-report.html';

// Set up arguments for the main application
process.argv = ['node', 'renovate-reporter', inputFile, outputFile];

// Load and execute the main application
require('../app/html-report.js');
