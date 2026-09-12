import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  // jest-dom is imported per-test-file since expect isn't available
  // during Jest's setupFiles phase (before the test framework loads).
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        jsx: "react-jsx",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss)$": "<rootDir>/src/test/__mocks__/styleMock.ts",
  },
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

export default config;
