import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { AuthProvider } from "../src/auth";

describe("signed out", () => {
  it("issues zero graph calls and shows exactly the sign-in button", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const auth: AuthProvider = {
      account: () => null,
      signIn: vi.fn(async () => {}),
      signOut: vi.fn(async () => {}),
      getToken: vi.fn(async () => ({ accessToken: "t", scopes: [] })),
    };
    render(<App auth={auth} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(auth.getToken).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
