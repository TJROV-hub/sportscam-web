import { readFileSync } from "node:fs";
import { join } from "node:path";

export const fixturePath = (n: string) => join(__dirname, "fixtures", "app", n);
export const fixture = (n: string): unknown => JSON.parse(readFileSync(fixturePath(n), "utf8"));
