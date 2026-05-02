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
          return token.role === "PARENT" || token.role === "EMPLOYER";
        }

        return true;
      },
    },
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
  ],
};
