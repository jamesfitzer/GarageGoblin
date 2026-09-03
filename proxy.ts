import { clerkMiddleware } from "@clerk/nextjs/server";

export const clerkCspOptions = {
  strict: true,
  directives: {
    "base-uri": ["self"],
    "object-src": ["none"],
    "frame-ancestors": ["none"],
  },
};

const isPublicAuthRoute = (pathname: string) =>
  pathname === "/sign-in" || pathname.startsWith("/sign-in/") ||
  pathname === "/sign-up" || pathname.startsWith("/sign-up/");

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  if (isPublicAuthRoute(pathname)) return;

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
    return;
  }

  await auth.protect();
}, { contentSecurityPolicy: clerkCspOptions });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
