import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTokenSource } from "../src/graph";
import { encodeShareLink, resolveByLink, resolveFolder } from "../src/resolve";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
let fetchMock: ReturnType<typeof vi.fn>;
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));
const LINK = "https://1drv.ms/f/s!Abc?x=1&y=ö>>>";
const GRAPH = "https://graph.microsoft.com/v1.0";

beforeEach(() => {
  localStorage.clear();
  setTokenSource(async () => ({ accessToken: "t", scopes: [] }));
});
const stub = (fn: (u: string) => Response) => {
  fetchMock = vi.fn(async (u: string) => fn(u));
  vi.stubGlobal("fetch", fetchMock);
};
const okItem = () => json({ id: "ITEM1", name: "Recording_90-8", parentReference: { driveId: "DRIVE1" } });

describe("folder resolution (ADR-0035)", () => {
  it("configured link: one GET /shares, cached; the second resolve issues no request", async () => {
    stub(okItem);
    const a = await resolveFolder("acct", LINK);
    expect(a).toMatchObject({ driveId: "DRIVE1", itemId: "ITEM1", resolvedBy: "shareLink" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urls()[0]).toBe(`${GRAPH}/shares/${encodeShareLink(LINK)}/driveItem?$select=id,name,parentReference`);
    const b = await resolveFolder("acct", LINK);
    expect(b?.itemId).toBe("ITEM1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sportscam.folder.acct")).toContain("shareLink");
  });

  it("base64url encoding: u! prefix, no padding, -_ alphabet", () => {
    const enc = encodeShareLink(LINK);
    expect(enc.startsWith("u!")).toBe(true);
    expect(enc.slice(2)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(enc).not.toContain("=");
    expect(enc.slice(2)).toContain("_"); // ">>>" encodes to a "/" in plain base64
  });

  it.each([403, 404])("configured link %i: no cache entry, manual path offered, pasted link caches", async (status) => {
    stub((u) => (u.includes(encodeShareLink(LINK)) ? json({}, status) : okItem()));
    expect(await resolveFolder("acct", LINK)).toBeNull();
    expect(localStorage.getItem("sportscam.folder.acct")).toBeNull();
    const pasted = "https://example.test/pasted";
    const r = await resolveByLink("acct", pasted);
    expect(r).toMatchObject({ itemId: "ITEM1", resolvedBy: "shareLink" });
    expect(urls()[1]).toContain(`/shares/${encodeShareLink(pasted)}/driveItem`);
    expect(localStorage.getItem("sportscam.folder.acct")).toContain("shareLink");
  });

  it.each(["REPLACE_WITH_VIEW_LINK", "", undefined])("placeholder/empty link %j: no request, manual path offered", async (v) => {
    stub(okItem);
    expect(await resolveFolder("acct", v)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
