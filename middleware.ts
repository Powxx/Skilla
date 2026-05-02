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
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Vérification des droits
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/teacher") && token.role !== "TEACHER") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/student") && token.role !== "STUDENT") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/parent") && token.role !== "PARENT") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/employer") && token.role !== "EMPLOYER") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/prof/:path*", "/student/:path*", "/parent/:path*", "/employer/:path*"],
};