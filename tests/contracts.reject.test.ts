import { describe, expect, it } from "vitest";
import { decodeMatch, decodeSession } from "../src/contracts";
import { fixture } from "./helpers";

const clone = <T>(x: unknown) => structuredClone(x) as T;

describe("decoders reject bad input", () => {
  it("rejects schema 2", () => {
    expect(() => decodeSession({ ...clone<object>(fixture("session.v1.json")), schema: 2 })).toThrow();
    expect(() => decodeMatch({ ...clone<object>(fixture("match.v1.json")), schema: 2 })).toThrow();
  });
  it('rejects status "queued"', () => {
    expect(() => decodeSession({ ...clone<object>(fixture("session.v1.json")), status: "queued" })).toThrow();
    expect(() => decodeMatch({ ...clone<object>(fixture("match.v1.json")), status: "queued" })).toThrow();
  });
  it("rejects a session with a missing phone key", () => {
    const s = clone<{ phones: Record<string, unknown> }>(fixture("session.v1.json"));
    delete s.phones.right;
    expect(() => decodeSession(s)).toThrow();
  });
});
