const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const os = require('node:os');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:31339', reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'], defaultBrowserType: 'webkit' } },
    { name: 'small-phone', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 }, hasTouch: true } }
  ],
  webServer: {
    command: 'npm start', url: 'http://127.0.0.1:31339', reuseExistingServer: false,
    env: { PORT: '31339', RUBLIKS_DB_PATH: path.join(os.tmpdir(), 'rubliks-test-' + process.pid + '.db') }
  }
});
