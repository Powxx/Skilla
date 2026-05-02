import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. On récupère le token manuellement sans passer par withAuth
  // Cela permet de voir le log même si le token est invalide
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  console.log("--- MIDDLEWARE LIVE DEBUG ---");
  console.log("Path:", pathname);
  console.log("Token trouvé:", !!token);
  console.log("Rôle dans le token:", token?.role);

  // 2. Si l'utilisateur n'est pas connecté du tout
  if (!token) {
    console.log("=> Redirection : Pas de session");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3. Protection par rôles
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    console.log("=> Redirection : Rôle ADMIN manquant");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/prof") && token.role !== "TEACHER") {
    console.log("=> Redirection : Rôle TEACHER manquant");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/prof/:path*",
    "/student/:path*",
  ],
};