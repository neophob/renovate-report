const fs = require("fs");
const {
  readErrFromNdjsonFile,
  filterExcludedErrorMessages,
  readNdjsonFile,
  uniqueReposMap,
} = require("./renovate-filter.js");

const EXCLUDED_ERROR_MSG = ["isBranchConflicted: cleanup error"];

let affectedRepos;
let analyzedRepositories = [];
let managersUsage = {};
let missingDependencies = [];

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log(
    "You must give 2 arguments:\n The input ndjson file to parse\n The output html file name (renovate-errors-cloud.html)",
  );
  process.exit(1);
}
const inputFile = args[0];
const outputFile = args[1];
let allEvents = [];

function compare(a, b) {
  if (a.msg === b.msg) {
    return a.repository
      .split("/")
      .pop()
      .localeCompare(b.repository.split("/").pop());
  }
  return b.msg.localeCompare(a.msg);
}

// finds the projects which are logged most messages, limit by nr
// If fewer than nr projects exist, it will show all projects
function findNoisyProjects(nr) {
  const map = new Map();

  // map all messages to a specific repo
  allEvents.forEach((entry) => {
    const key = entry.repository;
    // System messages do not have a repo, ignore those messages
    if (key) {
      const value = map.has(key) ? map.get(key) : [];
      value.push(entry);
      map.set(key, value);
    }
  });

  // find the most noisy repos
  const tempSizeArray = [];
  let avgCounter = 0;
  const iterFind = map.values();
  let resultFind = iterFind.next();
  while (!resultFind.done) {
    tempSizeArray.push(resultFind.value.length);
    avgCounter += resultFind.value.length;
    resultFind = iterFind.next();
  }
  avgCounter = parseInt(avgCounter / map.size);

  // get maximal entires and reduce result
  const sortedArray = tempSizeArray.sort((a, b) => a - b).reverse();
  // Use a fallback value of 0 if there are fewer projects than nr
  const minimalEntries = sortedArray.length >= nr ? sortedArray[nr - 1] : 0;
  const returnMap = new Map();
  const iter = map.entries();
  let result = iter.next();
  while (!result.done) {
    const [key, value] = result.value;
    if (value.length > minimalEntries) {
      returnMap.set(key, value);
    }
    result = iter.next();
  }

  // create an ordered Map
  const mapArray = Array.from(returnMap);
  mapArray.sort((a, b) => b[1].length - a[1].length);
  const orderedMap = new Map(mapArray);

  // If no projects matched our criteria or there are fewer projects than requested,
  // include all projects (sorted by log count)
  let displayMap = orderedMap;
  if (orderedMap.size === 0 || map.size <= nr) {
    // Sort all projects by log count
    const allMapArray = Array.from(map);
    allMapArray.sort((a, b) => b[1].length - a[1].length);
    displayMap = new Map(allMapArray);
  }

  // convert to string
  let table = "<table>";
  displayMap.forEach((value, key) => {
    table +=
      `<tr><td>${key}</td>` + `<td>${value.length} log entries</td></tr>`;
  });
  table +=
    `<tr><td><b>Average of ${map.size} projects</b></td>` +
    `<td>${avgCounter} log entries</td></tr>`;
  table += "</table></body></html>";
  return table;
}

// find analyzed repositories
function getAnalyzedRepositories() {
  // First try to find repositories from autodiscovery logs
  const autodiscoveredRepoEntries = allEvents.filter((entry) => {
    return (
      entry.msg &&
      entry.msg === "Autodiscovered repositories" &&
      entry.repositories
    );
  });

  if (
    autodiscoveredRepoEntries.length > 0 &&
    autodiscoveredRepoEntries[0].repositories
  ) {
    analyzedRepositories = autodiscoveredRepoEntries[0].repositories || [];
  } else {
    // If no autodiscovered repos found, look for repositories in config logs
    const configEntries = allEvents.filter((entry) => {
      return (
        entry.msg &&
        (entry.msg === "Combined config" || entry.msg === "File config") &&
        entry.config &&
        entry.config.repositories
      );
    });

    if (configEntries.length > 0 && configEntries[0].config.repositories) {
      analyzedRepositories = configEntries[0].config.repositories || [];
    }
  }

  const repoText = analyzedRepositories.join(", ");

  return `<div>
  <h1><b>Analyzed Repositories (${analyzedRepositories.length})</b></h1>
  <p style="font-size: 12px;">${repoText}</p>
  </div>`;
}

// find how many MR were created
function getNrOfCreatedMr() {
  const messages = allEvents.filter((entry) => {
    return (
      entry.msg &&
      entry.msg.includes("Preparing files for committing to branch")
    );
  });

  console.log("getNrOfCreatedMr", { messages })

  affectedRepos = uniqueReposMap(messages);
  let table = "<table><tr>"+
    "<th>Repo</th>"+
    "<th>Branch</th>";
  const allAffectedRepos = Array.from(affectedRepos.keys());
  allAffectedRepos.forEach((repo) => {
    table += `<tr><td>${repo}</td><td>${affectedRepos.get(repo)}</td>`;
  });
  table += "</table></body></html>";

  return `<div>
  <h1><b>Created Merge Requests (${affectedRepos.size})</b></h1>
  <ul class="list-disc">
    ${table}
  </ul>
  </div>`;
}

// Collect and summarize managers usage across all repositories
function getManagersUsageStats() {
  // Filter log entries for manager extract durations
  const managerEntries = allEvents.filter((entry) => {
    return (
      entry.msg &&
      entry.msg === "manager extract durations (ms)" &&
      entry.managers
    );
  });

  // Aggregate the managers usage
  managersUsage = {};
  let totalRepositoriesWithManagers = 0;

  managerEntries.forEach((entry) => {
    if (entry.managers && entry.repository) {
      totalRepositoriesWithManagers++;

      // Count each manager occurrence
      Object.keys(entry.managers).forEach((manager) => {
        if (!managersUsage[manager]) {
          console.log("add manager", manager);
          managersUsage[manager] = {
            repositoryCount: 0,
            totalFiles: 0,
          };
        }

        managersUsage[manager].repositoryCount++;
        managersUsage[manager].totalFiles += entry.managers[manager];
      });
    }
  });

  // Sort managers by repository count (descending)
  const sortedManagers = Object.keys(managersUsage).sort(
    (a, b) =>
      managersUsage[b].repositoryCount - managersUsage[a].repositoryCount,
  );

  // Create the HTML table
  let table = "<table>";
  table += `<tr>
    <th>Manager</th>
    <th>Repositories</th>
    <th>% of Repos</th>
    <th>Total Files</th>
    <th>Avg Files per Repo</th>
  </tr>`;

  sortedManagers.forEach((manager) => {
    const data = managersUsage[manager];
    const percentOfRepos = (
      (data.repositoryCount / totalRepositoriesWithManagers) *
      100
    ).toFixed(1);
    const avgFilesPerRepo = (data.totalFiles / data.repositoryCount).toFixed(1);

    table += `<tr>
      <td>${manager}</td>
      <td>${data.repositoryCount}</td>
      <td>${percentOfRepos}%</td>
      <td>${data.totalFiles}</td>
      <td>${avgFilesPerRepo}</td>
    </tr>`;
  });

  table += "</table>";

  return `<div>
    <h1><b>Package Managers Usage (${sortedManagers.length} different managers)</b></h1>
    <p>Data collected from ${totalRepositoriesWithManagers} repositories</p>
    ${table}
  </div>`;
}

/**
 * @param {RenovateLogLine[]} data
 * @return {string}
 */
// Find dependencies that were not found in repositories
function getDependenciesNotFound() {
  // Look for content not found messages
  const notFoundEntries = allEvents.filter((entry) => {
    return (
      entry.msg &&
      (entry.msg === "Content is not found for Maven url" ||
        entry.msg.includes("Content is not found") ||
        (entry.msg.includes("http") && entry.msg.includes("statusCode=404")))
    );
  });

  // Create a map to deduplicate missing dependencies by their dependency name/URL and repository
  const dependencyMap = new Map();

  notFoundEntries.forEach((entry) => {
    if (!entry.repository) return;

    let depName = "";
    let depVersion = "";

    // Extract dependency info from URL if present
    if (entry.url) {
      const urlParts = entry.url.split("/");
      // Get the last meaningful parts like org/name/version
      if (urlParts.length >= 3) {
        depName = urlParts.slice(-3, -1).join("/");
        depVersion = urlParts[urlParts.length - 1];
        // Handle maven-metadata.xml format
        if (depVersion.includes("maven-metadata.xml")) {
          depVersion = depVersion
            .replace("maven-metadata.xml", "")
            .replace(/-$/, "");
        }
      }
    } else if (entry.msg.includes("http")) {
      // Try to extract info from HTTP message
      const msgParts = entry.msg.split(" ");
      const urlIndex = msgParts.findIndex((part) => part.startsWith("http"));
      if (urlIndex >= 0) {
        const url = msgParts[urlIndex];
        const urlParts = url.split("/");
        if (urlParts.length >= 3) {
          depName = urlParts.slice(-3, -1).join("/");
          depVersion = urlParts[urlParts.length - 1];
          if (depVersion.includes("maven-metadata.xml")) {
            depVersion = depVersion
              .replace("maven-metadata.xml", "")
              .replace(/-$/, "");
          }
        }
      }
    }

    // Skip if we couldn't extract a dependency name
    if (!depName) return;

    // Create a unique key for this dependency + repository combo
    const key = `${entry.repository}|${depName}`;

    // Store the entry if we haven't seen this dependency for this repo before
    if (!dependencyMap.has(key)) {
      dependencyMap.set(key, {
        repository: entry.repository,
        dependency: depName,
        version: depVersion,
        url: entry.url || (entry.msg.match(/https?:\/\/[^\s=]+/) || [""])[0],
        message: entry.msg,
      });
    }
  });

  // Convert map to array for the report
  missingDependencies = Array.from(dependencyMap.values());

  if (missingDependencies.length === 0) {
    return "<p>No missing dependencies detected.</p>";
  }

  let table = `
  <table>
    <tr>
      <th>#</th>
      <th>Repository</th>
      <th>Dependency</th>
      <th>URL/Details</th>
    </tr>`;

  missingDependencies.forEach((item, index) => {
    table += `
    <tr>
      <td>${index + 1}</td>
      <td>${item.repository}</td>
      <td>${item.dependency}</td>
      <td>${item.url || item.message}</td>
    </tr>`;
  });

  table += "</table>";
  return table;
}

function createHtmlTable(errors) {
  const diffErrors = new Set(errors.map((e) => e.msg)).size;
  let table = `
<!DOCTYPE html>
<html lang="en">
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Renovate Errors</title>
  <style>
    table, th, td {border: 1.5px solid black;font-size: 12px; padding: 4px;}
    tr:nth-child(even) { background: AliceBlue; }
    body {background-color: Azure; padding: 12px;}
</style>
</head>
<body>

${getAnalyzedRepositories()}

<br>

${getNrOfCreatedMr()}

<br>

<h1><b>Noisy Projects</b></h1>
${findNoisyProjects(16)}

<br>

${getManagersUsageStats()}

<br>

<h1><b>Dependencies Not Found</b></h1>
${getDependenciesNotFound()}

<br>

<h1><b>Oh no: ${errors.length} errors (${diffErrors} different types)</b></h1>
<table>
  <tr>
    <th>#</th>
    <th>Repository</th>
    <th>Error Type</th>
    <th>Details</th>
    <th>Package Info</th>
  </tr>`;
  let index = 1;
  errors.forEach((row) => {
    if (!row.repository) {
      console.error(`invalid row detected: `, row);
    } else {
      const tkId = row.repository.split("/").pop();
      let packageInfo = "";
      if (row.dependency) {
        packageInfo = `<b>Dependency:</b> ${row.dependency}`;
        if (row.packageFile) {
          packageInfo += `<br><b>File:</b> ${row.packageFile}`;
        }
      }

      table +=
        "<tr>" +
        `<td>${index++}</td>` +
        `<td>${tkId}</td>` +
        `<td>${row.type || "unknown"}</td>` +
        `<td>${row.msg}<br><pre>${row.err?.message || ""}</pre></td>` +
        `<td>${packageInfo}</td>` +
        "</tr>";
    }
  });
  table += "</table></body></html>";
  return table;
}

/**
 *
 * @param {string} inputFile
 * @param {string} outputFile
 * @return {Promise<void>}
 */
async function execute(inputFile, outputFile) {
  const allErrors = await readErrFromNdjsonFile(inputFile);
  allEvents = await readNdjsonFile(inputFile);
  //console.log("Events recorded:", allEvents.length);
  const errors = filterExcludedErrorMessages(allErrors, EXCLUDED_ERROR_MSG);
  errors.sort(compare);

  const table = createHtmlTable(errors);
  fs.writeFileSync(outputFile, table);

  const createdMergeRequests = affectedRepos.length;
  const analyzedReposCount = analyzedRepositories.length;
  const npmErrors = errors.length;
  const managersCount = Object.keys(managersUsage).length;
  const missingDependenciesCount = missingDependencies.length;
  console.log(
    JSON.stringify({
      analyzedReposCount,
      createdMergeRequests,
      outputFile,
      npmErrors,
      managersCount,
      missingDependenciesCount,
    }),
  );
}

execute(inputFile, outputFile);
