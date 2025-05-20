import { Router } from "express";
import getLogger from "../lib/logger.js";
import { dbClient } from "../../prisma/client.js";
import { parseStackTrace } from "../lib/parse-error.js";

const logger = getLogger("server");
const router = Router();

router.post("/json-report", async (request, response, next) => {
  const report = request.body;

  try {
    let executionRecord = await dbClient.execution.findFirst({
      where: {
        name: report.runId,
      },
    });

    if (!executionRecord) {
      const { runId, env, version, stats } = report;

      executionRecord = await dbClient.execution.create({
        data: {
          type: "nightly",
          name: runId,
          environment: env,
          version,
          startedAt: stats.startTime,
        },
      });

      logger.info(`create new execution record: ${executionRecord.id}`);
    }

    if (!report.tests || !report.tests.length) {
      throw new Error(`Execution #${executionRecord.id} has no specs`);
    }

    for (const spec of report.tests) {
      if (!spec.title) {
        throw new Error(`Spec data is missing title: ${spec.location?.file}`);
      }

      let [specKey] = spec.title.match(/C\d+/) || [];

      if (!specKey) {
        specKey = spec.custom_id;
      }

      let specRecord = await dbClient.spec.findFirst({
        where: {
          key: specKey,
        },
      });

      if (!specRecord) {
        specRecord = await dbClient.spec.create({
          data: {
            key: specKey,
            file: spec.location.file,
            title: spec.title,
            tags: JSON.stringify(spec.tags),
            annotations: JSON.stringify(spec.annotations),
          },
        });

        logger.info(`spec record added ${specRecord.id}`);
      }

      if (!spec.results || !spec.results?.length) {
        throw new Error(`Spec (#${specRecord.id}) report has no results data`);
      }

      for (const result of spec.results) {
        let resultRecord = await dbClient.result.findFirst({
          where: {
            specId: specRecord.id,
            executionId: executionRecord.id,
            startTime: new Date(result.startTime),
          },
        });

        if (!resultRecord) {
          const recordData = {
            allureLink: result.allureLink,
            retry: result.retry,
            status: result.status,
            duration: result.duration,
            startTime: result.startTime,
            spec: {
              connect: {
                id: specRecord.id,
              },
            },
            execution: {
              connect: {
                id: executionRecord.id,
              },
            },
          };

          if (result.error) {
            const parsedError = parseStackTrace(result.error);

            const errorRecord = await dbClient.resultError.create({
              data: {
                type: parsedError.type,
                message: parsedError.message,
                callLog: JSON.stringify(parsedError.callLog),
                callStack: JSON.stringify(parsedError.callStack),
                testAssertion: parsedError.testAssertion,
                expectedPattern: parsedError.expectedPattern,
                receivedString: parsedError.receivedString,
                location: parsedError.location
                  ? `${parsedError.location.file}:${parsedError.location.line}`
                  : "",
              },
            });

            recordData.errors = {
              connect: {
                id: errorRecord.id,
              },
            };
          }

          resultRecord = await dbClient.result.create({
            data: recordData,
          });

          logger.info(`new result record added #${resultRecord.id}`);
        }
      }
    }

    return response.status(200).json({
      success: true,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
