import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Player from "../src/Player";

describe("Player re-fetch", () => {
  it("a media error triggers exactly one re-fetch and restores currentTime", async () => {
    let n = 0;
    const getUrl = vi.fn(async () => `https://dl.example/${++n}`);
    render(<Player label="t" getUrl={getUrl} />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await vi.waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    const v = document.querySelector("video") as HTMLVideoElement;
    expect(getUrl).toHaveBeenCalledTimes(1);

    let time = 42;
    Object.defineProperty(v, "currentTime", { get: () => time, set: (x: number) => (time = x), configurable: true });

    await act(async () => {
      fireEvent.error(v);
      fireEvent.error(v); // a second error before a frame loads must not re-fetch again
    });
    expect(getUrl).toHaveBeenCalledTimes(2);
    expect(v.getAttribute("src")).toBe("https://dl.example/2");

    time = 0; // new source resets the position
    fireEvent.loadedMetadata(v);
    expect(time).toBe(42);
  });
});
