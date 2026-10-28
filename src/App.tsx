import { useCallback, useEffect, useState } from "react";
import { CONFIG, type AuthProvider } from "./auth";
import type { AppSession } from "./contracts";
import { fetchMe, fetchSession, listMatches, resetLog, setTokenSource, type MatchEntry } from "./graph";
import MatchCard from "./MatchCard";
import RequestLog from "./RequestLog";
import { forgetCache, resolveByLink, resolveFolder, type Resolution } from "./resolve";

type Sessions = Record<string, Record<number, AppSession | null | undefined>>;

function SignedIn({ auth, homeAccountId }: { auth: AuthProvider; homeAccountId: string }) {
  const [me, setMe] = useState("");
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [needLink, setNeedLink] = useState(false);
  const [link, setLink] = useState("");
  const [matches, setMatches] = useState<MatchEntry[] | null>(null);
  const [sessions, setSessions] = useState<Sessions>({});
  const [error, setError] = useState("");
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    setTokenSource(() => auth.getToken());
    resetLog();
    let live = true;
    (async () => {
      try {
        setMe(await fetchMe());
        const r = await resolveFolder(homeAccountId, CONFIG.folderName);
        if (!live) return;
        if (r) setResolution(r);
        else setNeedLink(true);
      } catch (e) {
        if (live) setError(String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [auth, homeAccountId]);

  useEffect(() => {
    if (!resolution) return;
    let live = true;
    (async () => {
      try {
        const list = await listMatches(resolution);
        if (!live) return;
        setMatches(list);
        for (const m of list) {
          for (const h of m.match.halves) {
            void fetchSession(m.folder, h.folder).then((s) => {
              if (!live) return;
              setSessions((prev) => ({ ...prev, [m.match.id]: { ...prev[m.match.id], [h.half]: s } }));
            });
          }
        }
      } catch (e) {
        if (live) setError(String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [resolution]);

  const submitLink = useCallback(async () => {
    const r = await resolveByLink(homeAccountId, link);
    if (r) {
      setResolution(r);
      setNeedLink(false);
    } else setError("That sharing link did not resolve to a folder.");
  }, [homeAccountId, link]);

  const forget = () => {
    forgetCache(homeAccountId);
    setResolution(null);
    setMatches(null);
    setSessions({});
    setNeedLink(true);
  };

  return (
    <>
      <header>
        <span>{me}</span>
        <button onClick={() => void auth.signOut()}>Sign out</button>
        {resolution && <button onClick={forget}>Forget folder</button>}
      </header>
      {error && <p className="error">{error}</p>}
      {needLink && (
        <div className="paste">
          <p>The folder was not found. Paste the sharing link:</p>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" aria-label="Sharing link" />
          <button onClick={() => void submitLink()}>Use link</button>
        </div>
      )}
      {matches?.length === 0 && <p className="muted">No matches yet.</p>}
      {matches?.map((m) => (
        <MatchCard key={m.match.id} folder={m.folder} match={m.match} sessions={sessions[m.match.id] ?? {}} />
      ))}
      <footer>
        <button onClick={() => setShowLog((v) => !v)}>Requests</button>
        {showLog && <RequestLog resolution={resolution} />}
      </footer>
    </>
  );
}

export default function App({ auth }: { auth: AuthProvider }) {
  const acct = auth.account();
  if (!acct) {
    return (
      <main>
        <button onClick={() => void auth.signIn()}>Sign in with Microsoft</button>
      </main>
    );
  }
  return (
    <main>
      <SignedIn auth={auth} homeAccountId={acct.homeAccountId} />
    </main>
  );
}
