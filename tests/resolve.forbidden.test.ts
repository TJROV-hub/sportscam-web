import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const files = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? files(join(d, n)) : [join(d, n)]));

describe("ADR-0035 D3/D4: removed endpoints", () => {
  for (const word of ["sharedWithMe", "root/search"]) {
    it(`no file under src/ contains "${word}"`, () => {
      const offenders = files(join(__dirname, "..", "src")).filter((f) => readFileSync(f, "utf8").includes(word));
      expect(offenders).toEqual([]);
    });
  }
});
