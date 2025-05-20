import fs from "fs";
import path from "path";

const jsonReports = await readJsonReports();

for (const jsonReport of jsonReports) {
  try {
    const config = jsonReport.config;
    config.env = "staging";
    config.runId = jsonReport.runId;
    config.stats = jsonReport.stats;
    config.hash = jsonReport.hash;
    const tests = getTestCases(jsonReport.suites).map((test) => {
      test.results = test.results.map((result) => {
        result.allureLink =
          "https://automation.qa.theguarantors.com/allure-report/index.html";

        return result;
      });

      return test;
    });

    const body = JSON.stringify({
      ...config,
      tests,
      isJson: true,
    });

    const configResponse = await fetch(
      "http://localhost:3001/api/json-report",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      }
    );
    const res = await configResponse.json();

    console.log(res);

    if (!res.success) {
      console.log(
        `${jsonReport.runId}, ${jsonReport.hash} , ${JSON.stringify(
          res,
          null,
          4
        )}`
      );
    }
  } catch (err) {
    console.error(`${jsonReport.runId} not posted, ${err.message}`);
  }
}

async function readJsonReports() {
  const jsonDir = path.join(process.cwd(), "prisma", "seed", "json-examples");
  const files = fs.readdirSync(jsonDir);

  const reports = [];
  for (const file of files) {
    if (file.endsWith(".json")) {
      const filePath = path.join(jsonDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      reports.push(JSON.parse(content));
    }
  }
  return reports;
}

function getTestCases(suitesList, testCases = []) {
  for (const { suites, specs } of suitesList) {
    if (suites) {
      getTestCases(suites, testCases);
    }

    for (const spec of specs) {
      const flatSpecs = spec.tests.map((t) => ({
        ok: spec.ok,
        custom_id: spec.id,
        location: {
          file: spec.file,
          line: spec.line,
          column: spec.column,
        },
        title: spec.title,
        tags: spec.tags,
        timeout: t.timeout,
        annotations: t.annotations,
        expectedStatus: t.expectedStatus,
        projectId: t.projectId,
        projectName: t.projectName,
        results: t.results.map((r) => {
          const { errors, ...rest } = r;
          const maxSize = 10000;

          if (
            rest.error &&
            rest.error.message &&
            rest.error.message.length > maxSize
          ) {
            rest.error.message = rest.error.message.slice(0, maxSize);
            rest.error.stack = rest.error.stack.slice(0, maxSize);

            if (rest.error.matcherResult) {
              rest.error.matcherResult.message =
                rest.error.matcherResult.message.slice(0, maxSize);
              console.log("matcherResult was cut");
            }

            console.log("stack and messages were cut");
          }

          return rest;
        }),
        status: t.status,
        titlePath: [spec.file],
      }));

      testCases.push(...flatSpecs);
    }
  }

  return testCases;
}
