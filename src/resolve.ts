import { graphFetch, type Folder } from "./graph";

export type ResolvedBy = "sharedWithMe" | "ownerSearch" | "shareLink";
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

async function getItems(path: string): Promise<DriveItem[]> {
  const res = await graphFetch(path);
  if (!res.ok) return [];
  return ((await res.json()) as { value?: DriveItem[] }).value ?? [];
}

function save(homeAccountId: string, r: Resolution, storage: Storage): Resolution {
  storage.setItem(key(homeAccountId), JSON.stringify(r));
  return r;
}

/** Order of ADR-0033 D1 (a) and (b); null means the user must paste a sharing link. */
export async function resolveFolder(
  homeAccountId: string,
  folderName: string,
  storage: Storage = localStorage,
): Promise<Resolution | null> {
  const cached = readCache(homeAccountId, storage);
  if (cached) return cached;
  const now = () => new Date().toISOString();

  const shared = await getItems("/me/drive/sharedWithMe");
  const hit = shared.find((i) => i.remoteItem?.name === folderName && i.remoteItem.id);
  const driveId = hit?.remoteItem?.parentReference?.driveId;
  if (hit?.remoteItem && driveId) {
    return save(homeAccountId, { driveId, itemId: hit.remoteItem.id, resolvedBy: "sharedWithMe", resolvedAt: now() }, storage);
  }

  const q = encodeURIComponent(`'${folderName}'`);
  const found = (await getItems(`/me/drive/root/search(q=${q})`)).find(
    (i) => i.folder && i.name === folderName && i.parentReference?.driveId,
  );
  if (found?.parentReference?.driveId) {
    return save(homeAccountId, { driveId: found.parentReference.driveId, itemId: found.id, resolvedBy: "ownerSearch", resolvedAt: now() }, storage);
  }
  return null;
}

export async function resolveByLink(
  homeAccountId: string,
  link: string,
  storage: Storage = localStorage,
): Promise<Resolution | null> {
  const res = await graphFetch(`/shares/${encodeShareLink(link.trim())}/driveItem`);
  if (!res.ok) return null;
  const item = (await res.json()) as DriveItem;
  const driveId = item.parentReference?.driveId;
  if (!driveId) return null;
  return save(homeAccountId, { driveId, itemId: item.id, resolvedBy: "shareLink", resolvedAt: new Date().toISOString() }, storage);
}
