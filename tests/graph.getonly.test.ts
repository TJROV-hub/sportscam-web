import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphFetch, setTokenSource } from "../src/graph";

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
