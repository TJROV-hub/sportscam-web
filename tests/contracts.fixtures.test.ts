import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeMatch, decodeSession, decodeSyncEstimate } from "../src/contracts";
import { fixture, fixturePath } from "./helpers";

const sha = (n: string) => createHash("sha256").update(readFileSync(fixturePath(n))).digest("hex");

describe("tests decode the shared fixture JSONs", () => {
  it("pins the three SHA-256 digests (ADR-0033 D5)", () => {
    expect(sha("session.v1.json")).toBe("2ec34ec3ce13fff07ec6bd14a2f3c00da991b648d1fb1128e7fd62c66aa051eb");
    expect(sha("match.v1.json")).toBe("fadd4129a5934257954e9c9a0c104e9a4630ffe06e70d0c29b6c09fb8a0b1a70");
    expect(sha("sync.app_clock.json")).toBe("729377591941846ca1cc5f5e834a77c67b29a820546692a9e6aeb11d0060a31e");
  });
  it("decodes session.v1.json", () => {
    const s = decodeSession(fixture("session.v1.json"));
    expect(s.half).toBe(1);
    expect(s.phones.right.device).toBe("iPhone 15 Pro");
    expect(s.outputs.output_video).toBe("outputs/output_1080p.mp4");
  });
  it("decodes match.v1.json", () => {
    const m = decodeMatch(fixture("match.v1.json"));
    expect(m.halves).toHaveLength(2);
    expect(m.date).toBe("2026-11-02");
  });
  it("decodes sync.app_clock.json", () => {
    const e = decodeSyncEstimate(fixture("sync.app_clock.json"));
    expect(e.method).toBe("app_clock");
    expect(e.evidence.clock_sync_rtt_ms).toBe(2.1);
  });
});
