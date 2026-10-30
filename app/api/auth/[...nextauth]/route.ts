import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

async function authHandler(
  req: NextRequest,
  context: { params: Promise<{ nextauth?: string[] }> | { nextauth?: string[] } }
) {
  try {
    const params = await context.params;
    return await handler(req, { params });
  } catch (err) {
    console.error("[NextAuth Route Error]", err);
    return new Response(JSON.stringify({ error: "Authentication route error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export { authHandler as GET, authHandler as POST };
