import baseConfig from "./jest.config";
import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  ...baseConfig,
  testPathIgnorePatterns: ["/dist/"],
};

export default config;
