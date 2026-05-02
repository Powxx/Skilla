import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Protection par rôle via NextAuth `withAuth`.
 * Non connecté ou mauvais rôle → redirection vers `pages.signIn` (`/login`).
 */
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const { pathname } = req.nextUrl;
        console.log(`[Middleware] Path: ${pathname} | Role: ${token?.role}`);
        if (!token) {
          return false;
        }

        if (pathname.startsWith("/admin")) {
          return token.role === "ADMIN";
        }

        if (pathname.startsWith("/prof")) {
          return token.role === "TEACHER";
        }

        if (pathname.startsWith("/student")) {
          return token.role === "STUDENT";
        }

        if (pathname.startsWith("/parent")) {
          return token.role === "PARENT";
        }
        if (pathname.startsWith("/employer")) {
          return token.role === "EMPLOYER";
        }

        return true;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/prof",
    "/prof/:path*",
    "/student",
    "/student/:path*",
    "/parent",
    "/parent/:path*",
    "/employer",
    "/employer/:path*",
  ],
};