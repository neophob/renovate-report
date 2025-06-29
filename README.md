# Renovate Reporter

A command-line tool to parse Renovate debug NDJSON files and generate detailed HTML reports with comprehensive analysis of your Renovate bot runs.

## Usage

### One-time Usage with npx
```bash
npx renovate-reporter <input-file> [output-file]
```

### Command Line Interface

```bash
# Basic usage - generates renovate-report.html
npx renovate-reporter renovate-debug.ndjson

# Specify custom output file
npx renovate-reporter renovate-debug.ndjson custom-report.html

# Show help
npx renovate-reporter --help

# Show version
npx renovate-reporter --version
```

## Getting Renovate Debug Logs

To generate the NDJSON debug logs that this tool analyzes, run Renovate with debug logging enabled:

```bash
env:
  LOG_LEVEL: info
  RENOVATE_LOG_FILE: renovate-log.ndjson
  RENOVATE_LOG_FILE_LEVEL: debug
```

## Requirements

- Node.js 22.0.0 or higher
- Renovate debug NDJSON log files

## Development

### Testing

This project uses the Node.js built-in test runner for unit tests:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### GitHub Actions

Continuous integration is set up with GitHub Actions, which automatically runs tests on:
- All pushes to main/master branches
- All pull requests to main/master branches

The workflow runs tests against multiple Node.js versions (22.x) to ensure compatibility.
