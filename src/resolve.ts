import { graphFetch, type Folder } from "./graph";

export type ResolvedBy = "shareLink";
export interface Resolution extends Folder {
  resolvedBy: ResolvedBy;
  resolvedAt: string;
}

const key = (homeAccountId: string) => `sportscam.folder.${homeAccountId}`;

export function readCache(homeAccountId: string, storage: Storage = localStorage): Resolution | null {
  const raw = storage.getItem(key(homeAccountId));
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Resolution;
    return r.driveId && r.itemId ? r : null;
  } catch {
    return null;
  }
}
export const forgetCache = (homeAccountId: string, storage: Storage = localStorage) =>
  storage.removeItem(key(homeAccountId));

/** ADR-0030 D1: "u!" + base64url(link), no padding, alphabet -_ . */
export function encodeShareLink(link: string): string {
  const bytes = new TextEncoder().encode(link);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return "u!" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface DriveItem {
  id: string;
  name: string;
  folder?: unknown;
  parentReference?: { driveId?: string };
  remoteItem?: DriveItem;
}

function save(homeAccountId: string, r: Resolution, storage: Storage): Resolution {
  storage.setItem(key(homeAccountId), JSON.stringify(r));
  return r;
}

export const LINK_PLACEHOLDER = "REPLACE_WITH_VIEW_LINK";

/**
 * ADR-0035 D1/D2/D5: cache first, then the configured view-only sharing link through
 * /shares/u!.../driveItem. null means the manual paste input must be offered (no usable
 * configured link, or it returned non-2xx).
 */
export async function resolveFolder(
  homeAccountId: string,
  configuredLink: string | undefined,
  storage: Storage = localStorage,
): Promise<Resolution | null> {
  const cached = readCache(homeAccountId, storage);
  if (cached) return cached;
  const link = (configuredLink ?? "").trim();
  if (!link || link === LINK_PLACEHOLDER) return null;
  return resolveByLink(homeAccountId, link, storage);
}

export async function resolveByLink(
  homeAccountId: string,
  link: string,
  storage: Storage = localStorage,
): Promise<Resolution | null> {
  const res = await graphFetch(`/shares/${encodeShareLink(link.trim())}/driveItem?$select=id,name,parentReference`);
  if (!res.ok) return null;
  const item = (await res.json()) as DriveItem;
  const driveId = item.parentReference?.driveId;
  if (!driveId) return null;
  return save(homeAccountId, { driveId, itemId: item.id, resolvedBy: "shareLink", resolvedAt: new Date().toISOString() }, storage);
}
