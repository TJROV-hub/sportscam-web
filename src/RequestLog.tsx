import { useLog } from "./graph";
import type { Resolution } from "./resolve";

export default function RequestLog({ resolution }: { resolution: Resolution | null }) {
  const log = useLog();
  const short = (s: string) => s.slice(0, 8);
  return (
    <section className="log" aria-label="Request log">
      <div>scopes: {log.scopes.join(" ") || "(none yet)"}</div>
      <div>
        folder:{" "}
        {resolution
          ? `${resolution.resolvedBy} drive ${short(resolution.driveId)} item ${short(resolution.itemId)}`
          : "(unresolved)"}
      </div>
      {log.timings.map((t, i) => (
        <div key={i}>
          first frame {t.label}: {t.ms} ms
        </div>
      ))}
      <table>
        <tbody>
          {log.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.method}</td>
              <td className="path">{r.path}</td>
              <td>{r.status}</td>
              <td>{r.ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
