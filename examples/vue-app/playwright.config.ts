import { devices, PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  timeout: 30_000,
  testDir: "tests/e2e",
  testMatch: "*.test.ts",
  globalSetup: "tests/e2e/global-setup.ts",
  globalTeardown: "tests/e2e/global-teardown.ts",
  projects: [
    {
      name: "Chrome Stable",
      use: {
        browserName: "chromium",
        channel: "chrome",
      },
    },
    {
      name: "iOS Safari",
      use: {
        ...devices["iPad Pro 11 landscape"],
        trace: "retain-on-failure",
      },
    },
  ],
};
export default config;
