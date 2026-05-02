import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    console.log("--- DEBUG ROLE MIDDLEWARE ---");
    console.log("Path visité:", pathname);
    console.log("Rôle trouvé:", token?.role);

    // Protection Admin
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    // Protection Prof
    if (pathname.startsWith("/prof") && token?.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/parent") && token?.role !== "PARENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/student") && token?.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/employer") && token?.role !== "EMPLOYER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/prof/:path*",
    "/student/:path*",
    "/parent/:path*",
    "/employer/:path*",
  ],
};