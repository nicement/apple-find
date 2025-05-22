module.exports = {
  // Indicates that a setup file should be run before each test file in the suite.
  // This will execute combination_logic.js, making its functions globally available
  // to the test files, simulating the browser environment where scripts are loaded.
  setupFilesAfterEnv: ['./combination_logic.js'],
  testEnvironment: 'jsdom', // Or 'node', jsdom is good if any browser globals are lightly used
};
