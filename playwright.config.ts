import { defineConfig } from "@playwright/test";

/**
 * Phase 0 runs the `unit` project only: pure-logic specs that need no browser
 * and no server.
 *
 * The cross-provider contract suite and the browser flows arrive in Phase 5,
 * once there are pages to drive. They will be a second project here with a
 * `webServer` block running the app at DATA_SOURCE=mock.
 */
export default defineConfig({
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  projects: [{ name: "unit", testDir: "./tests/unit" }],
});
