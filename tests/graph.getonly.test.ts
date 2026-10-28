import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { downloadJson, graphFetch, setTokenSource } from "../src/graph";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => ({ accessToken: "SECRET", scopes: ["User.Read"] }));
});
afterEach(() => vi.unstubAllGlobals());

describe("graphFetch is GET-only", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    it(`throws on ${method} before any network call`, async () => {
      await expect(graphFetch("/me", { method })).rejects.toThrow(/read-only/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }
  it("attaches the bearer only to graph.microsoft.com", async () => {
    await graphFetch("/me");
    const h1 = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(h1.get("Authorization")).toBe("Bearer SECRET");
    await graphFetch("https://contoso.sharepoint.com/download?x=1");
    const h2 = new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers);
    expect(h2.get("Authorization")).toBeNull();
  });
});

describe("downloadJson", () => {
  it("sends no Authorization header and no credentials", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"a":1}', { status: 200 }));
    expect(await downloadJson("https://contoso.sharepoint.com/dl?x=1", "match.json")).toEqual({ a: 1 });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("Authorization")).toBeNull();
    expect(init.credentials).toBe("omit");
  });
  for (const method of ["POST", "PUT", "DELETE"]) {
    it(`refuses ${method}`, async () => {
      await expect(downloadJson("https://x.example/f", "f", { method })).rejects.toThrow(/read-only/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }
});

describe("no /content endpoint (CORS: 302 redirect)", () => {
  it("no source file under src/ contains '/content'", () => {
    const dir = join(__dirname, "..", "src");
    for (const f of readdirSync(dir)) {
      expect(readFileSync(join(dir, f), "utf8"), f).not.toContain("/content");
    }
  });
});
