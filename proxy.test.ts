import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: { options: unknown } = { options: undefined };
  return {
    state,
    clerkMiddleware: vi.fn((handler, options) => {
      state.options = options;
      return handler;
    }),
  };
});

vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: mocks.clerkMiddleware }));

import middleware, { clerkCspOptions } from "./proxy";

type TestAuth = (() => Promise<{ userId: string | null }>) & { protect: ReturnType<typeof vi.fn> };

function authState(userId: string | null) {
  const auth = vi.fn().mockResolvedValue({ userId }) as unknown as TestAuth;
  auth.protect = vi.fn().mockResolvedValue(undefined);
  return auth;
}

function runMiddleware(auth: TestAuth, pathname: string) {
  const handler = middleware as unknown as (auth: TestAuth, request: { nextUrl: { pathname: string } }) => Promise<Response | undefined>;
  return handler(auth, { nextUrl: { pathname } });
}

describe("Clerk middleware boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures Clerk's nonce-based strict CSP with the app's restrictive directives", () => {
    expect(clerkCspOptions).toEqual({
      strict: true,
      directives: {
        "base-uri": ["self"],
        "object-src": ["none"],
        "frame-ancestors": ["none"],
      },
    });
    expect(mocks.state.options).toEqual({ contentSecurityPolicy: clerkCspOptions });
  });

  it.each(["/sign-in", "/sign-in/continue", "/sign-up", "/sign-up/continue"])("keeps the public auth route %s accessible", async (pathname) => {
    const auth = authState(null);

    const response = await runMiddleware(auth, pathname);

    expect(response).toBeUndefined();
    expect(auth).not.toHaveBeenCalled();
    expect(auth.protect).not.toHaveBeenCalled();
  });

  it("protects application pages", async () => {
    const auth = authState(null);

    const response = await runMiddleware(auth, "/");

    expect(response).toBeUndefined();
    expect(auth.protect).toHaveBeenCalledOnce();
  });

  it("returns JSON 401 for unauthenticated API requests", async () => {
    const auth = authState(null);

    const response = await runMiddleware(auth, "/api/briefing");

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Authentication required." });
    expect(auth.protect).not.toHaveBeenCalled();
  });

  it("allows authenticated API requests to reach their handler", async () => {
    const auth = authState("user-a");

    const response = await runMiddleware(auth, "/api/workspace");

    expect(response).toBeUndefined();
    expect(auth).toHaveBeenCalledOnce();
    expect(auth.protect).not.toHaveBeenCalled();
  });
});
