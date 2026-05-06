const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/**/__tests__/**/*.(test|spec).(js|ts)"],
  watchman: false,
};

module.exports = createJestConfig(customJestConfig);

