// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import promptConfig from "../../jest.prompts.config";

jest.mock("dotenv", () => ({
  __esModule: true,
  default: { config: jest.fn() },
}));

describe("live prompt test credentials", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const dotenvMock = jest.requireMock<{ default: { config: jest.Mock } }>("dotenv");

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    dotenvMock.default.config.mockReset();
  });

  const loadCredentialFlag = (): boolean => {
    let flag = false;
    jest.isolateModules(() => {
      const environment = jest.requireActual<{ hasOpenAiCredentials: boolean }>(
        "../../__prompts-tests__/testEnv",
      );
      flag = environment.hasOpenAiCredentials;
    });
    return flag;
  };

  it.each([undefined, "", "   "])("disables live suites for missing or blank key %s", (key) => {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    expect(loadCredentialFlag()).toBe(false);
    expect(dotenvMock.default.config).toHaveBeenCalledTimes(1);
  });

  it("enables live suites using credentials loaded from dotenv", () => {
    delete process.env.OPENAI_API_KEY;
    dotenvMock.default.config.mockImplementation(() => {
      process.env.OPENAI_API_KEY = "key-from-dotenv";
    });
    expect(loadCredentialFlag()).toBe(true);
  });

  it("enables live suites using exported credentials", () => {
    process.env.OPENAI_API_KEY = "exported-key";
    expect(loadCredentialFlag()).toBe(true);
  });

  it("does not inherit the unit-test placeholder setup in every live project", () => {
    expect(promptConfig.projects).toHaveLength(3);
    for (const project of promptConfig.projects ?? []) {
      expect(project).toMatchObject({ setupFiles: [] });
    }
  });
});
