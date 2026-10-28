import { useSyncExternalStore } from "react";
import { decodeMatch, decodeSession, type AppMatch, type AppSession } from "./contracts";

const GRAPH = "https://graph.microsoft.com/v1.0";
const GRAPH_HOST = "graph.microsoft.com";

// ---- request log (ADR-0033 D4): never holds a token or a download URL ----
export interface LogRow {
  method: string;
  path: string;
  status: number;
  ms: number;
}
export interface LogState {
  rows: LogRow[];
  scopes: string[];
  timings: { label: string; ms: number }[];
}
let log: LogState = { rows: [], scopes: [], timings: [] };
const listeners = new Set<() => void>();
const emit = (next: LogState) => {
  log = next;
  listeners.forEach((l) => l());
};
export const getLog = () => log;
export const useLog = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => log,
  );
export const resetLog = () => emit({ rows: [], scopes: [], timings: [] });
export const recordTiming = (label: string, ms: number) =>
  emit({ ...log, timings: [...log.timings, { label, ms }] });

/** Path for display: no query, and a sharing-link token is cut. */
export function displayPath(p: string): string {
  const noQuery = p.replace(/^https?:\/\/[^/]+(\/v1\.0)?/, "").split("?")[0];
  return noQuery.replace(/(\/shares\/u!)[^/]*/, "$1…");
}

// ---- GET-only wrapper (ADR-0033 D2) ----
let getToken: (() => Promise<{ accessToken: string; scopes: string[] }>) | null = null;
export function setTokenSource(fn: typeof getToken) {
  getToken = fn;
}

export async function graphFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET") throw new Error(`graphFetch is read-only: ${method} refused`);
  const url = path.startsWith("http") ? path : GRAPH + path;
  const headers = new Headers(init.headers);
  if (new URL(url).hostname === GRAPH_HOST) {
    if (!getToken) throw new Error("no token source");
    const t = await getToken();
    headers.set("Authorization", `Bearer ${t.accessToken}`);
    if (t.scopes.join(" ") !== log.scopes.join(" ")) emit({ ...log, scopes: t.scopes });
  }
  const t0 = performance.now();
  let status = 0;
  try {
    const res = await fetch(url, { ...init, method: "GET", headers });
    status = res.status;
    return res;
  } finally {
    emit({
      ...log,
      rows: [...log.rows, { method: "GET", path: displayPath(path), status, ms: Math.round(performance.now() - t0) }],
    });
  }
}

export async function graphJson<T>(path: string): Promise<T> {
  const res = await graphFetch(path);
  if (!res.ok) throw new Error(`Graph ${res.status} for ${displayPath(path)}`);
  return (await res.json()) as T;
}

// ---- loaders ----
export interface Folder {
  driveId: string;
  itemId: string;
}
interface Child {
  id: string;
  name: string;
  folder?: unknown;
}

const itemPath = (f: Folder, rel: string) => `/drives/${f.driveId}/items/${f.itemId}:/${rel}`;

export async function fetchMe(): Promise<string> {
  const me = await graphJson<{ displayName?: string }>("/me?$select=displayName");
  return me.displayName ?? "";
}

export interface MatchEntry {
  folder: Folder;
  match: AppMatch;
}

/** 1 children request + one match.json per Recording_* folder; folders without match.json are skipped. */
export async function listMatches(root: Folder): Promise<MatchEntry[]> {
  const kids = await graphJson<{ value: Child[] }>(
    `/drives/${root.driveId}/items/${root.itemId}/children?$select=id,name,folder&$top=200`,
  );
  const dirs = kids.value.filter((c) => c.folder && c.name.startsWith("Recording_"));
  const found = await Promise.all(
    dirs.map(async (d): Promise<MatchEntry | null> => {
      const folder = { driveId: root.driveId, itemId: d.id };
      const res = await graphFetch(`${itemPath(folder, "match.json:")}/content`);
      if (!res.ok) return null;
      try {
        return { folder, match: decodeMatch(await res.json()) };
      } catch {
        return null;
      }
    }),
  );
  return found
    .filter((x): x is MatchEntry => x !== null)
    .sort((a, b) => b.match.date.localeCompare(a.match.date));
}

export async function fetchSession(f: Folder, halfFolder: string): Promise<AppSession | null> {
  const res = await graphFetch(`${itemPath(f, `${halfFolder}/session.json:`)}/content`);
  if (!res.ok) return null;
  try {
    return decodeSession(await res.json());
  } catch {
    return null;
  }
}

/** Fetched on tap; null on 404 ("not processed yet"). The URL is never logged or stored. */
export async function fetchDownloadUrl(f: Folder, halfFolder: string, outputRel: string): Promise<string | null> {
  const res = await graphFetch(
    `${itemPath(f, `${halfFolder}/${outputRel}`)}?$select=id,size,@microsoft.graph.downloadUrl`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Graph ${res.status}`);
  const j = (await res.json()) as Record<string, unknown>;
  const u = j["@microsoft.graph.downloadUrl"];
  return typeof u === "string" ? u : null;
}
