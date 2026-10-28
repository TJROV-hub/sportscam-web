import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { decodeMatch, decodeSession } from "../src/contracts";
import MatchCard from "../src/MatchCard";
import { fixture } from "./helpers";

describe("MatchCard", () => {
  it("shows badge, both half rows, error only on the failed half, agreement and Play where due", () => {
    const match = decodeMatch(fixture("match.v1.json"));
    const s1 = { ...decodeSession(fixture("session.v1.json")), status: "failed" as const, errors: ["missing segment 2"] };
    const s2 = { ...decodeSession(fixture("session.v1.json")), half: 2, status: "done" as const, sync_agreement_ms: 12.3 };
    render(<MatchCard folder={{ driveId: "d", itemId: "i" }} match={match} sessions={{ 1: s1, 2: s2 }} />);

    expect(screen.getByText("Recording_2026-11-02_1400_vs-Herlev")).toBeInTheDocument();
    expect(screen.getByText(/Club U15 vs Herlev \(home\)/)).toBeInTheDocument();
    expect(screen.getByText("2026-11-02")).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem").filter((li) => li.className === "half");
    expect(rows).toHaveLength(2);
    const [h1, h2] = rows;
    expect(within(h1).getByText("Half 1")).toBeInTheDocument();
    expect(within(h1).getByText("failed")).toBeInTheDocument();
    expect(within(h1).getByText("missing segment 2")).toBeInTheDocument();
    expect(within(h1).queryByRole("button", { name: "Play" })).toBeNull();
    expect(within(h2).getByText("Half 2")).toBeInTheDocument();
    expect(within(h2).getByText("done")).toBeInTheDocument();
    expect(within(h2).getByText("app/audio agreement 12.3 ms")).toBeInTheDocument();
    expect(within(h2).queryByText("missing segment 2")).toBeNull();
    expect(within(h2).getByRole("button", { name: "Play" })).toBeInTheDocument();
    // match badge = match.json.status (fixture: recording)
    expect(screen.getByText("recording")).toBeInTheDocument();
  });
});
