import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCOPES } from "../src/auth";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe("scopes are read-only", () => {
  it("is exactly the three scopes", () => {
    expect(SCOPES).toEqual(["User.Read", "Files.Read.All", "offline_access"]);
  });
  it('has no string containing "Write" under src/', () => {
    const offenders = files(join(__dirname, "..", "src")).filter((f) => readFileSync(f, "utf8").includes("Write"));
    expect(offenders).toEqual([]);
  });
});
