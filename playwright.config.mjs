import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4321", video: "on" },
  outputDir: "test-results",
  webServer: { command: "node serve.mjs", url: "http://localhost:4321", reuseExistingServer: true },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
    { name: "laptop", use: { viewport: { width: 1280, height: 800 } } },
  ],
});
