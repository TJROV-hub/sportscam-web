import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTokenSource } from "../src/graph";
import { encodeShareLink, resolveByLink, resolveFolder } from "../src/resolve";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
let fetchMock: ReturnType<typeof vi.fn>;
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  localStorage.clear();
  setTokenSource(async () => ({ accessToken: "t", scopes: [] }));
});
const stub = (fn: (u: string) => Response) => {
  fetchMock = vi.fn(async (u: string) => fn(u));
  vi.stubGlobal("fetch", fetchMock);
};

describe("folder resolution order (ADR-0033 D1)", () => {
  it("sharedWithMe hit is cached; the second call issues no request", async () => {
    stub(() =>
      json({ value: [{ id: "x", remoteItem: { id: "ITEM1", name: "Recording_90-8", parentReference: { driveId: "DRIVE1" } } }] }),
    );
    const a = await resolveFolder("acct", "Recording_90-8");
    expect(a).toMatchObject({ driveId: "DRIVE1", itemId: "ITEM1", resolvedBy: "sharedWithMe" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const b = await resolveFolder("acct", "Recording_90-8");
    expect(b?.itemId).toBe("ITEM1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sportscam.folder.acct")).toContain("sharedWithMe");
  });

  it("miss falls to ownerSearch", async () => {
    stub((u) =>
      u.includes("sharedWithMe")
        ? json({ value: [] })
        : json({ value: [{ id: "OWN", name: "Recording_90-8", folder: {}, parentReference: { driveId: "D2" } }] }),
    );
    const r = await resolveFolder("acct", "Recording_90-8");
    expect(r).toMatchObject({ itemId: "OWN", driveId: "D2", resolvedBy: "ownerSearch" });
    expect(urls()[1]).toContain("/me/drive/root/search(q=");
  });

  it("double miss returns null, then the share-link path is used with u! base64url", async () => {
    stub((u) =>
      u.includes("/shares/") ? json({ id: "SH", parentReference: { driveId: "D3" } }) : json({ value: [] }),
    );
    expect(await resolveFolder("acct", "Recording_90-8")).toBeNull();
    const link = "https://1drv.ms/f/s!Abc?x=1&y=ö>>>";
    const r = await resolveByLink("acct", link);
    expect(r).toMatchObject({ itemId: "SH", resolvedBy: "shareLink" });
    const shareUrl = urls().find((u) => u.includes("/shares/"))!;
    expect(shareUrl).toBe(`https://graph.microsoft.com/v1.0/shares/${encodeShareLink(link)}/driveItem`);
    const enc = encodeShareLink(link);
    expect(enc.startsWith("u!")).toBe(true);
    expect(enc.slice(2)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(enc).not.toContain("=");
    expect(enc.slice(2)).toContain("_"); // ">>>" encodes to a "/" in plain base64
  });
});
