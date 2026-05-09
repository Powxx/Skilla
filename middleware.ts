import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Debug des cookies bruts
  const sessionCookie = req.cookies.get("__Secure-next-auth.session-token") || req.cookies.get("next-auth.session-token");
  
  console.log("--- DEBUG SESSION ---");
  console.log("Cookie présent ?", !!sessionCookie);
  console.log("Nom du cookie détecté :", sessionCookie?.name);

  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    // On force la détection sécurisée si on est sur Vercel
    secureCookie: process.env.NODE_ENV === "production" 
  });

  console.log("Token décodé ?", !!token);
  console.log("Rôle trouvé :", token?.role);

  if (!token) {
    // Si on a le cookie mais pas de token, le SECRET est en cause
    if (sessionCookie) {
      console.error("ERREUR : Cookie présent mais indéchiffrable. Vérifiez NEXTAUTH_SECRET.");
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
      case "ADMIN": return NextResponse.redirect(new URL("/admin", req.url));
      case "TEACHER": return NextResponse.redirect(new URL("/prof", req.url));
      case "STUDENT": return NextResponse.redirect(new URL("/student/dashboard", req.url));
      case "RESPONSIBLE": return NextResponse.redirect(new URL("/parent/dashboard", req.url));
      case "COMPANY_TUTOR": return NextResponse.redirect(new URL("/employer/dashboard", req.url));
    }
  }

  // Vérification des droits
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/prof") && token.role !== "TEACHER" && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/student") && token.role !== "STUDENT" && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/parent") && token.role !== "RESPONSIBLE" && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/employer") && token.role !== "COMPANY_TUTOR" && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/prof/:path*", "/student/:path*", "/parent/:path*", "/employer/:path*"],
};