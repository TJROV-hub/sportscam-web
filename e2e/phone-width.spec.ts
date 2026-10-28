import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fx = (n: string) => JSON.parse(readFileSync(join(process.cwd(), "tests", "fixtures", "app", n), "utf8"));

async function setup(page: Page) {
  const match = fx("match.v1.json");
  const s1 = { ...fx("session.v1.json"), status: "done", sync_agreement_ms: 12.3 };
  const s2 = { ...fx("session.v1.json"), half: 2, status: "failed", errors: ["missing segment 2 with a deliberately long message to test wrapping at phone width"] };
  await page.addInitScript(() => {
    (window as unknown as { __TEST_AUTH__: unknown }).__TEST_AUTH__ = {
      account: () => ({ homeAccountId: "test-account", name: "Test" }),
      signIn: async () => {},
      signOut: async () => {},
      getToken: async () => ({ accessToken: "test-token", scopes: ["User.Read", "Files.Read.All", "offline_access"] }),
    };
  });
  await page.route("https://files.example.test/**", (route) => {
    const n = route.request().url();
    return route.fulfill({ json: n.endsWith("match.json") ? match : n.endsWith("s1.json") ? s1 : s2 });
  });
  await page.route("https://graph.microsoft.com/**", async (route) => {
    const u = decodeURIComponent(route.request().url());
    const ok = (b: unknown) => route.fulfill({ json: b });
    if (u.includes("/me?")) return ok({ displayName: "Test Person" });
    if (u.includes("sharedWithMe"))
      return ok({ value: [{ id: "s", remoteItem: { id: "ROOTITEM1234", name: "Recording_90-8", parentReference: { driveId: "DRIVE12345678" } } }] });
    if (u.includes("/children"))
      return ok({ value: [{ id: "M1", name: match.name, folder: {} }, { id: "M2", name: "Recording_old", folder: {} }] });
    if (u.includes("M1:/match.json")) return ok({ id: "f1", "@microsoft.graph.downloadUrl": "https://files.example.test/match.json" });
    if (u.includes("M1:/half-1/session.json")) return ok({ id: "f2", "@microsoft.graph.downloadUrl": "https://files.example.test/s1.json" });
    if (u.includes("M1:/half-2/session.json")) return ok({ id: "f3", "@microsoft.graph.downloadUrl": "https://files.example.test/s2.json" });
    return route.fulfill({ status: 404, json: {} });
  });
}

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.use({ viewport: { width: 390, height: 844 } });

test("phone width 390: no horizontal overflow, both half rows visible", async ({ page }) => {
  await setup(page);
  await page.goto("/sportscam-web/");
  await expect(page.getByText("Half 1")).toBeVisible();
  await expect(page.getByText("Half 2")).toBeVisible();
  await expect(page.getByText("app/audio agreement 12.3 ms")).toBeVisible();
  expect(await noOverflow(page)).toBe(true);

  // "one card expanded": the card with both halves and the request log open
  await page.getByRole("button", { name: "Requests" }).click();
  await expect(page.getByText(/scopes: User.Read Files.Read.All offline_access/)).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  await page.screenshot({ path: "e2e/out/phone-390.png", fullPage: true });
});
