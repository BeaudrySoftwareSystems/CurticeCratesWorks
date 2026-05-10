// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => ({
  signOut: mocks.signOut,
}));

import { signOutAction } from "@/app/actions/auth";

afterEach(() => {
  mocks.signOut.mockClear();
});

describe("signOutAction", () => {
  it("delegates to NextAuth signOut with a redirect back to /sign-in", async () => {
    await signOutAction();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
  });
});
