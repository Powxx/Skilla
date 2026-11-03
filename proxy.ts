import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes API publiques : authentification NextAuth, cron (protégé par CRON_SECRET)
 * et flux calendrier (protégés par jeton personnel).
 */
function isPublicApiRoute(req: NextRequest): boolean {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/calendar/sync/")) return true;
  if (pathname === "/api/calendar/export" && searchParams.has("token")) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi && isPublicApiRoute(req)) {
    return NextResponse.next();
  }

  // Debug des cookies bruts
  const sessionCookie = req.cookies.get("__Secure-next-auth.session-token") || req.cookies.get("next-auth.session-token");
  

  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    // Détection automatique du cookie sécurisé pour éviter les faux négatifs
    secureCookie: sessionCookie?.name?.startsWith("__Secure-") ?? (process.env.NODE_ENV === "production")
  });


  // Un jeton révoqué (compte désactivé ou supprimé) est traité comme une absence de session
  if (!token || token.revoked || !token.role) {
    if (sessionCookie && !token) {
      console.error("ERREUR : Cookie présent mais indéchiffrable. Vérifiez NEXTAUTH_SECRET.");
    }
    // Défense en profondeur : les routes API exigent une session (chaque route vérifie aussi ses droits)
    if (isApi) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    // Ne pas rediriger si on est déjà sur /login ou / (landing page)
    if (pathname === "/login" || pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirection automatique si on est sur la home ou le login alors qu'on est déjà connecté
  if (pathname === "/" || pathname === "/login") {
    switch (token.role) {
      case "SUPER_ADMIN":
      case "ADMIN": return NextResponse.redirect(new URL("/admin", req.url));
      case "TEACHER": return NextResponse.redirect(new URL("/prof", req.url));
      case "STUDENT": return NextResponse.redirect(new URL("/student/dashboard", req.url));
      case "RESPONSIBLE": return NextResponse.redirect(new URL("/parent/dashboard", req.url));
      case "COMPANY_TUTOR": return NextResponse.redirect(new URL("/employer/dashboard", req.url));
    }
  }

  if (isApi) {
    const isAdminApi = pathname.startsWith("/api/admin/") || pathname.startsWith("/api/hr/");
    if (isAdminApi && token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Vérification des droits
  if (pathname.startsWith("/admin") && token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/prof") && token.role !== "TEACHER" && token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/student") && token.role !== "STUDENT" && token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/parent") && token.role !== "RESPONSIBLE" && token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/employer") && token.role !== "COMPANY_TUTOR" && token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/", 
    "/login", 
    "/admin/:path*", 
    "/prof/:path*", 
    "/student/:path*", 
    "/parent/:path*", 
    "/employer/:path*",
    "/messages/:path*",
    "/meetings/:path*",
    "/settings/:path*",
    "/survey/:path*",
    "/reclamation/:path*",
    "/api/:path*"
  ],
};