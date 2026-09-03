import { describe, expect, it } from "vitest";
import config, { securityHeaders } from "./next.config";

describe("security response headers", () => {
  it("applies the baseline headers to every route", async () => {
    expect(await config.headers?.()).toEqual([{ source: "/:path*", headers: securityHeaders }]);
  });

  it("uses the intended restrictive values", () => {
    expect(Object.fromEntries(securityHeaders.map((header) => [header.key, header.value]))).toEqual({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    });
  });
});
