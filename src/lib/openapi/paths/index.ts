import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registerComponents } from "./components";
import { registerIssuePaths } from "./issues";
import { registerAssumptionPaths } from "./assumptions";
import { registerResultPaths } from "./results";
import { registerSpecPaths } from "./specs";
import { registerResultErrorPaths } from "./resultErrors";
import { registerExecutionPaths } from "./executions";
import { registerReportPaths } from "./reports";
import { registerAuthPaths } from "./auth";
import { registerUserPaths } from "./users";
import { registerTestAnalysisPaths } from "./testAnalysis";
import { registerMcpTokenPaths } from "./mcpToken";
import { registerErrorFormatterPaths } from "./errorFormatter";
import { registerPromptPaths } from "./prompts";
import { registerMcpServerPaths } from "./mcp";

export function registerPaths(registry: OpenAPIRegistry): void {
  registerComponents(registry);
  registerIssuePaths(registry);
  registerAssumptionPaths(registry);
  registerResultPaths(registry);
  registerSpecPaths(registry);
  registerResultErrorPaths(registry);
  registerExecutionPaths(registry);
  registerReportPaths(registry);
  registerAuthPaths(registry);
  registerUserPaths(registry);
  registerTestAnalysisPaths(registry);
  registerMcpTokenPaths(registry);
  registerErrorFormatterPaths(registry);
  registerPromptPaths(registry);
  registerMcpServerPaths(registry);
}
