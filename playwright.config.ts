import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e/out/results",
  use: { baseURL: "http://localhost:5173" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/sportscam-web/",
    reuseExistingServer: false,
    env: { VITE_SHARED_FOLDER_LINK: "https://example.test/view-link-for-e2e" },
    timeout: 60_000,
  },
});
