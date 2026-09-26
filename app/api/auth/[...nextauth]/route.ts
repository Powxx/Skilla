import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

async function authHandler(
  req: NextRequest,
  context: { params: Promise<{ nextauth?: string[] }> | { nextauth?: string[] } }
) {
  // Dans Next.js 15+, context.params est une Promise.
  // NextAuth v4 attend un objet params synchrone pour extraire l'action (session, csrf, signin, etc.).
  const params = await context.params;
  return handler(req, { params });
}

export { authHandler as GET, authHandler as POST };
