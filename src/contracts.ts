// Mirrors docs/architecture/contracts.md rows AppSession / AppMatch / SyncEstimate
// (pipeline repository, ADR-0030 D3). Fixtures under tests/fixtures/app are pinned by SHA-256.
import { z } from "zod";

export const STATUSES = ["recording", "uploading", "uploaded", "processing", "done", "failed"] as const;
const Status = z.enum(STATUSES);
const HomeAway = z.enum(["home", "away"]);

const AppDirector = z.object({ upn: z.string(), device: z.string() });
const AppPhone = z.object({
  device: z.string(),
  app_version: z.string(),
  first_frame_host_ns: z.number(),
  clip: z.string(),
  bytes: z.number(),
});
const AppCapture = z.object({
  codec: z.string(),
  fps: z.number(),
  width: z.number(),
  height: z.number(),
  bitrate_mbps: z.number(),
  lens: z.string(),
  exposure_locked: z.boolean(),
});
const AppWorker = z.object({
  host: z.string().nullable(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  sportscam_version: z.string().nullable(),
});
const AppOutputs = z.object({
  output_video: z.string(),
  panorama: z.string(),
  metrics: z.string(),
});
const AppMatchHalf = z.object({
  half: z.number().int().min(1),
  folder: z.string(),
  session_id: z.string(),
});

export const AppSessionSchema = z.object({
  schema: z.literal(1),
  id: z.string(),
  match_id: z.string(),
  half: z.number().int().min(1),
  name: z.string(),
  kicked_off_at: z.string(),
  home: z.string(),
  opponent: z.string(),
  home_away: HomeAway,
  director: AppDirector,
  phones: z.object({ left: AppPhone, right: AppPhone }),
  capture: AppCapture,
  status: Status,
  offset_ms: z.number().nullable(),
  sync_agreement_ms: z.number().nullable(),
  worker: AppWorker,
  outputs: AppOutputs,
  errors: z.array(z.string()),
});

export const AppMatchSchema = z.object({
  schema: z.literal(1),
  id: z.string(),
  name: z.string(),
  home: z.string(),
  opponent: z.string(),
  home_away: HomeAway,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  director: AppDirector,
  halves: z.array(AppMatchHalf),
  status: Status,
});

export const SyncEstimateSchema = z.object({
  offset_ms: z.number(),
  confidence: z.number(),
  method: z.enum(["audio_xcorr", "visual_xcorr", "creation_time", "manual", "app_clock"]),
  drift_ms_per_min: z.number(),
  checked_at_ms: z.array(z.number()),
  window_offsets_ms: z.array(z.number()),
  evidence: z.record(z.string(), z.number()),
  visual_validation: z.unknown().nullable(),
});

export type Status = z.infer<typeof Status>;
export type AppDirector = z.infer<typeof AppDirector>;
export type AppPhone = z.infer<typeof AppPhone>;
export type AppCapture = z.infer<typeof AppCapture>;
export type AppWorker = z.infer<typeof AppWorker>;
export type AppOutputs = z.infer<typeof AppOutputs>;
export type AppMatchHalf = z.infer<typeof AppMatchHalf>;
export type AppSession = z.infer<typeof AppSessionSchema>;
export type AppMatch = z.infer<typeof AppMatchSchema>;
export type SyncEstimate = z.infer<typeof SyncEstimateSchema>;

export const decodeSession = (x: unknown): AppSession => AppSessionSchema.parse(x);
export const decodeMatch = (x: unknown): AppMatch => AppMatchSchema.parse(x);
export const decodeSyncEstimate = (x: unknown): SyncEstimate => SyncEstimateSchema.parse(x);
