import { useCallback } from "react";
import type { AppMatch, AppSession } from "./contracts";
import { fetchDownloadUrl, type Folder } from "./graph";
import Player from "./Player";

interface Props {
  folder: Folder;
  match: AppMatch;
  /** session.json per half index; undefined = loading, null = absent or undecodable */
  sessions: Record<number, AppSession | null | undefined>;
}

function HalfRow({ folder, match, half, session }: { folder: Folder; match: AppMatch; half: AppMatch["halves"][number]; session: AppSession | null | undefined }) {
  const outputRel = session?.outputs.output_video ?? "outputs/output_1080p.mp4";
  const getUrl = useCallback(() => fetchDownloadUrl(folder, half.folder, outputRel), [folder, half.folder, outputRel]);
  const label = `${match.name} half ${half.half}`;
  return (
    <li className="half">
      <div className="half-head">
        <strong>Half {half.half}</strong>
        {session === undefined && <span className="muted">loading…</span>}
        {session === null && <span className="muted">not processed yet</span>}
        {session && <span className={`badge ${session.status}`}>{session.status}</span>}
      </div>
      {session?.status === "failed" && session.errors.length > 0 && (
        <ul className="errors">
          {session.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {session && session.sync_agreement_ms !== null && (
        <div className="muted">app/audio agreement {session.sync_agreement_ms} ms</div>
      )}
      {session?.status === "done" && <Player label={label} getUrl={getUrl} />}
      {session && session.status !== "done" && session.status !== "failed" && (
        <span className="muted">not processed yet</span>
      )}
    </li>
  );
}

export default function MatchCard({ folder, match, sessions }: Props) {
  return (
    <article className="card">
      <h2>{match.name}</h2>
      <div>
        {match.home} vs {match.opponent} ({match.home_away})
      </div>
      <div className="muted">{match.date}</div>
      <span className={`badge ${match.status}`}>{match.status}</span>
      <ul className="halves">
        {match.halves.map((h) => (
          <HalfRow key={h.half} folder={folder} match={match} half={h} session={sessions[h.half]} />
        ))}
      </ul>
    </article>
  );
}
