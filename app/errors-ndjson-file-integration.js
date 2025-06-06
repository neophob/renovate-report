const readline = require("readline");
const fs = require("fs");
const events = require("events");

/**
 * @typedef RenovateLogLine
 * @property {string?} type - Type of error
 * @property {string} repository - Repository path
 * @property {string} branch - branch repository
 * @property {'npm'|'docker'|'maven'} type? - The type of the log line
 * @property {{message:string}} err - Error object
 * @property {string} msg - Error message
 * @property {string} dependency - The dependency that failed
 * @property {string} packageFile - The file containing the dependency
 * @property {string} url - URL related to the dependency
 */

/**
 * @arg {string} inputFile
 * @return {Promise<RenovateLogLine[]>}
 */
async function readErrFromNdjsonFile(inputFile) {
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file '${inputFile}' not found!`);
    process.exit(1);
  }
  try {
    const result = new Map();
    const rl = readline.createInterface({
      input: fs.createReadStream(inputFile),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const obj = JSON.parse(line);
      // Check for regular errors with 'err' property or specific error messages
      if (
        Object.keys(obj).includes("err") ||
        (obj.msg && obj.msg.startsWith("Failed to look up"))
      ) {
        const key = obj.repository;
        if (key) {
          // Only process if we have a repository
          let value = result.get(key);
          if (!value || !value.type) {
            value = obj;
            // If it's a "Failed to look up" message without an err property, create one
            if (
              !value.err &&
              value.msg &&
              value.msg.startsWith("Failed to look up")
            ) {
              value.err = {
                message: `${value.msg}${value.dependency ? ": " + value.dependency : ""}${value.packageFile ? " in " + value.packageFile : ""}`,
              };

              // Determine error type from message
              if (value.msg.includes("npm package")) {
                value.type = "npm";
              } else if (value.msg.includes("docker package")) {
                value.type = "docker";
              }
            }
          }
          delete value.name;
          delete value.hostname;
          delete value.pid;
          delete value.level;
          delete value.logContext;
          delete value.time;
          delete value.v;
          result.set(key, value);
        }
      }
    });
    await events.once(rl, "close");

    // console.log('Reading file line by line with readline done.');
    // const used = process.memoryUsage().heapUsed / 1024 / 1024;
    // console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
    // console.log('result.length', result.length);
    return Array.from(result.values());
  } catch (err) {
    console.error(`${inputFile} failed!`);
    console.error(err);
  }
}

// read ndjson file and return all records
async function readNdjsonFile(inputFile) {
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file '${inputFile}' not found!`);
    process.exit(1);
  }
  try {
    const result = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(inputFile),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const value = JSON.parse(line);
      delete value.name;
      delete value.hostname;
      delete value.pid;
      delete value.level;
      delete value.logContext;
      delete value.time;
      delete value.v;
      result.push(value);
    });
    await events.once(rl, "close");
    return result;
  } catch (err) {
    console.error(`${inputFile} failed!`);
    console.error(err);
  }
}

// return unique repos
function uniqueRepos(repoArray) {
  const repoSet = new Set();
  repoArray.forEach((entry) => repoSet.add(entry.repository));
  return Array.from(repoSet);
}

/**
 * @param {RenovateLogLine[]} errors
 * @param {string[]} excludedErrorMsg
 * @return {RenovateLogLine[]}
 */
function filterExcludedErrorMessages(errors, excludedErrorMsg) {
  return errors.filter(
    (err) => !excludedErrorMsg.some((excluded) => err.msg === excluded),
  );
}

module.exports = {
  readErrFromNdjsonFile,
  filterExcludedErrorMessages,
  readNdjsonFile,
  uniqueRepos,
};
