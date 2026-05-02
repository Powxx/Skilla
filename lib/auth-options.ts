import type { NextAuthOptions } from "next-auth";
import type { Role } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email?.trim();
        const password = credentials?.password;
        if (!emailRaw || typeof password !== "string") {
          return null;
        }

        const email = emailRaw.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Persiste le `role` Prisma dans le JWT pour le middleware `withAuth`
     * et pour la reconstruction de la session.
     */
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        token.sub = user.id;
      }
      return token;
    },
    /**
     * Expose `user.role` côté client (`useSession`) et serveur (`getServerSession`).
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.role) {
          session.user.role = token.role as Role;
        }
      }
      return session;
    },
  },
};
