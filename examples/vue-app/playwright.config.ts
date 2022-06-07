import { devices, PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  timeout: 30_000,
  testDir: "tests/e2e",
  testMatch: "*.test.ts",
  projects: [
    {
      name: "Chrome Stable",
      use: {
        browserName: "chromium",
        channel: "chrome",
      },
    }
  ],
};
export default config;
