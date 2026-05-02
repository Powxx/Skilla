import { withAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // 1. Extraction manuelle du token pour le debug
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    console.log("--- MIDDLEWARE DEBUG START ---");
    console.log("Path:", pathname);
    console.log("Token Role:", token?.role);
    console.log("Full Token Payload:", token);
    console.log("--- MIDDLEWARE DEBUG END ---");

    // 2. Logique de redirection par rôle
    // Si on est sur /admin et que le rôle n'est pas ADMIN
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      console.warn("ACCÈS REFUSÉ : Tentative d'accès admin par role:", token?.role);
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Si on est sur /prof et que le rôle n'est pas TEACHER
    if (pathname.startsWith("/prof") && token?.role !== "TEACHER") {
      console.warn("ACCÈS REFUSÉ : Tentative d'accès prof par role:", token?.role);
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Cette fonction est appelée AVANT le middleware ci-dessus
      authorized: ({ token }) => {
        // Si pas de token, on renvoie vers la page de login
        return !!token;
      },
    },
    // On passe explicitement le secret ici aussi
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      signIn: "/login",
    },
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