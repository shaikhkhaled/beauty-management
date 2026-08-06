const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  // Start the server before E2E tests run
  webServer: {
    command: 'node src/app.js',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
