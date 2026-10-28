import { useCallback, useEffect, useRef, useState } from "react";
import { recordTiming } from "./graph";

export const URL_MAX_AGE_MS = 50 * 60 * 1000;

interface Props {
  label: string;
  /** Fetches a fresh download URL; null means the output does not exist (404). */
  getUrl: () => Promise<string | null>;
}

export default function Player({ label, getUrl }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [firstFrameMs, setFirstFrameMs] = useState<number | null>(null);
  const tapAt = useRef(0);
  const resumeAt = useRef<number | null>(null);
  const errorRefetched = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const reload = useRef<() => void>(() => {});

  const load = useCallback(
    async (resume: boolean) => {
      if (resume) resumeAt.current = video.current?.currentTime ?? 0;
      const url = await getUrl();
      if (url === null) {
        setMissing(true);
        return;
      }
      setSrc(url);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => reload.current(), URL_MAX_AGE_MS);
    },
    [getUrl],
  );

  useEffect(() => {
    reload.current = () => void load(true);
  }, [load]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onPlay = async () => {
    setBusy(true);
    tapAt.current = performance.now();
    try {
      await load(false);
    } finally {
      setBusy(false);
    }
  };

  const onError = () => {
    if (errorRefetched.current) return;
    errorRefetched.current = true; // exactly one re-fetch until a frame loads again
    void load(true);
  };

  const onLoadedMetadata = () => {
    if (resumeAt.current !== null && video.current) {
      video.current.currentTime = resumeAt.current;
      resumeAt.current = null;
    }
  };

  const onLoadedData = () => {
    errorRefetched.current = false;
    if (firstFrameMs === null) {
      const ms = Math.round(performance.now() - tapAt.current);
      setFirstFrameMs(ms);
      recordTiming(label, ms);
    }
  };

  return (
    <div className="player">
      {src === null && !missing && (
        <button onClick={onPlay} disabled={busy}>
          {busy ? "Loading…" : "Play"}
        </button>
      )}
      {missing && <span className="muted">not processed yet</span>}
      {src !== null && (
        <video
          ref={video}
          src={src}
          controls
          playsInline
          preload="metadata"
          autoPlay
          onError={onError}
          onLoadedMetadata={onLoadedMetadata}
          onLoadedData={onLoadedData}
        />
      )}
      {firstFrameMs !== null && <div className="muted">first frame after {firstFrameMs} ms</div>}
    </div>
  );
}
