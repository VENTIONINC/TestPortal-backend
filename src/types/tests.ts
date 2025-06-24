export interface PlaywrightSpecTest {
  timeout: number;
  annotations: Array<any>;
  expectedStatus: string;
  projectId: string;
  projectName: string;
  results: Array<{
    workerIndex: number;
    status: string;
    duration: number;
    error?: {
      message: string;
      stack: string;
      location: {
        file: string;
        column: number;
        line: number;
      };
      snippet: string;
    };
    errors: Array<{
      location: {
        file: string;
        column: number;
        line: number;
      };
      message: string;
    }>;
    stdout: Array<{
      text: string;
    }>;
    stderr: Array<{
      text: string;
    }>;
    retry: number;
    steps?: Array<{
      title: string;
      duration: number;
      steps?: Array<{
        title: string;
        duration: number;
      }>;
    }>;
    startTime: string;
    attachments: Array<{
      name: string;
      contentType: string;
      path: string;
    }>;
    errorLocation?: {
      file: string;
      column: number;
      line: number;
    };
  }>;
  status: string;
}

export interface PlaywrightSpec {
  title: string;
  ok: boolean;
  tags: Array<string>;
  tests: PlaywrightSpecTest[];
  id: string;
  file: string;
  line: number;
  column: number;
}

export interface PlaywrightSuite {
  title: string;
  file: string;
  column: number;
  line: number;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

export interface PlaywrightTestResults {
  config: {
    configFile: string;
    rootDir: string;
    forbidOnly: boolean;
    fullyParallel: boolean;
    globalSetup: string | null;
    globalTeardown: string | null;
    globalTimeout: number;
    grep: Record<string, any>;
    grepInvert: string | null;
    maxFailures: number;
    metadata: {
      actualWorkers: number;
    };
    preserveOutput: string;
    reporter: Array<string | Array<string>>;
    reportSlowTests: {
      max: number;
      threshold: number;
    };
    quiet: boolean;
    projects: Array<{
      outputDir: string;
      repeatEach: number;
      retries: number;
      metadata: Record<string, any>;
      id: string;
      name: string;
      testDir: string;
      testIgnore: Array<any>;
      testMatch: Array<string>;
      timeout: number;
    }>;
    shard: any;
    updateSnapshots: string;
    version: string;
    workers: number;
    webServer: any;
  };
  // Use the recursive PlaywrightSuite interface
  suites: Array<PlaywrightSuite>;
  errors: Array<any>;
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    skipped: number;
    unexpected: number;
    flaky: number;
  };
  customReport: {
    testName: string;
    testNameHash: string;
    status: string;
  };
  runId: string;
  hash: string;
}

