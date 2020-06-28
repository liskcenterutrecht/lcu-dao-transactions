
module.exports = {
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.json'
    }
  },
  collectCoverage: true,
  reporters: [
    "default",
    ["jest-junit", {outputDirectory: "./coverage/"}],
  ],
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'cobertura',
  ],
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '<rootDir>/test/helpers/',
    '<rootDir>/test/fixtures/'
  ],
  resetModules: true,
  restoreMocks: true,
};
