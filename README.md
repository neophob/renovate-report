# Renovate Reporter

A command-line tool to parse Renovate debug NDJSON files and generate detailed HTML reports with comprehensive analysis of your Renovate bot runs.

## Features

- 📊 **Comprehensive Analysis**: Analyzes Renovate debug logs to provide insights into bot performance
- 🏗️ **Manager Usage Stats**: Shows which package managers are being used across repositories
- 🔍 **Error Reporting**: Identifies and categorizes errors encountered during Renovate runs
- 📈 **Repository Insights**: Shows noisy projects and merge request creation statistics
- 🚫 **Missing Dependencies**: Detects dependencies that couldn't be found
- 📱 **HTML Output**: Generates beautiful, responsive HTML reports with Tailwind CSS styling

## Installation

### Global Installation
```bash
npm install -g renovate-reporter
```

### One-time Usage with npx
```bash
npx renovate-reporter <input-file> [output-file]
```

## Usage

### Command Line Interface

```bash
# Basic usage - generates renovate-report.html
renovate-reporter renovate-debug.ndjson

# Specify custom output file
renovate-reporter renovate-debug.ndjson custom-report.html

# Show help
renovate-reporter --help

# Show version
renovate-reporter --version
```

### Programmatic Usage

```javascript
const { generateReport } = require('renovate-reporter');

async function createReport() {
  try {
    const result = await generateReport('renovate-debug.ndjson', 'my-report.html');
    console.log('Report generated successfully:', result);
  } catch (error) {
    console.error('Failed to generate report:', error.message);
  }
}

createReport();
```

## Getting Renovate Debug Logs

To generate the NDJSON debug logs that this tool analyzes, run Renovate with debug logging enabled:

```bash
# Self-hosted Renovate
LOG_LEVEL=debug renovate --schedule= > renovate-debug.ndjson 2>&1

# Renovate CLI
LOG_LEVEL=debug renovate-cli --schedule= > renovate-debug.ndjson 2>&1

# GitHub Actions (add to your workflow)
env:
  LOG_LEVEL: debug
```

## Report Contents

The generated HTML report includes:

### 📊 **Repository Analysis**
- Total number of analyzed repositories
- List of all repositories processed by Renovate

### 🚀 **Merge Request Statistics**
- Number of merge requests/pull requests created
- Affected repositories

### 📢 **Noisy Projects**
- Repositories generating the most log entries
- Average log entries per repository

### 🛠️ **Package Manager Usage**
- Which package managers are detected (npm, Maven, Docker, etc.)
- Usage statistics across repositories
- Average files per repository for each manager

### ❌ **Error Analysis**
- Categorized errors encountered during Renovate runs
- Repository-specific error details
- Excluded common/expected errors

### 🔍 **Missing Dependencies**
- Dependencies that couldn't be found or downloaded
- URLs and repositories affected

## API Reference

### `generateReport(inputFile, outputFile)`

Generates an HTML report from a Renovate NDJSON debug log file.

**Parameters:**
- `inputFile` (string): Path to the input NDJSON file
- `outputFile` (string, optional): Path to the output HTML file (default: 'renovate-report.html')

**Returns:** Promise<Object> with report statistics

**Example:**
```javascript
const stats = await generateReport('logs/renovate.ndjson', 'reports/analysis.html');
```

### Other Exported Functions

- `readErrFromNdjsonFile(inputFile)`: Extract errors from NDJSON file
- `readNdjsonFile(inputFile)`: Read all entries from NDJSON file
- `filterExcludedErrorMessages(errors, excludedMessages)`: Filter out excluded error messages
- `uniqueRepos(repoArray)`: Get unique repositories from array

## Configuration

### Excluded Error Messages

You can customize which error messages are excluded from the report by modifying the `EXCLUDED_ERROR_MSG` array in `app/errors-message-excluded.js`.

## Requirements

- Node.js 14.0.0 or higher
- Renovate debug NDJSON log files

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/neophob/renovate-reporter/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/neophob/renovate-reporter/issues)
- 📖 **Documentation**: [GitHub Wiki](https://github.com/neophob/renovate-reporter/wiki)
