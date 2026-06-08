import type { NextAuthOptions } from "next-auth";
import type { Role } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { updateLoginStreak } from "@/app/actions/gamification";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { 
    strategy: "jwt", 
    maxAge: 24 * 60 * 60 // 24 heures
  },
  secret: process.env.NEXTAUTH_SECRET,
  
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          const emailRaw = credentials?.email?.trim();
          const password = credentials?.password;

          if (!emailRaw || !password) return null;

          const email = emailRaw.toLowerCase();
          
          const user = await prisma.user.findUnique({ 
            where: { email },
            select: { 
              id: true, 
              email: true, 
              password: true, 
              role: true, 
              firstName: true, 
              lastName: true, 
              canAccessLivrets: true,
              canManageUsers: true,
              canManageSettings: true,
              canManagePlanning: true,
              canManageRH: true,
              isActive: true
            }
          });

          if (!user || !user.password) return null;
          
          if (user.isActive === false) {
            throw new Error("Compte désactivé. Veuillez contacter l'administration.");
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (!isPasswordValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            role: user.role,
            canAccessLivrets: user.canAccessLivrets,
            canManageUsers: user.canManageUsers,
            canManageSettings: user.canManageSettings,
            canManagePlanning: user.canManagePlanning,
            canManageRH: user.canManageRH,
          };
          
        } catch (error) {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role as Role;
        token.id = user.id;
        token.canAccessLivrets = (user as any).canAccessLivrets ?? false;
        token.canManageUsers = (user as any).canManageUsers ?? false;
        token.canManageSettings = (user as any).canManageSettings ?? false;
        token.canManagePlanning = (user as any).canManagePlanning ?? false;
        token.canManageRH = (user as any).canManageRH ?? false;
      }

      if (trigger === "update" && session?.impersonateUser) {
        token.originalUserId = token.originalUserId || token.id;
        token.originalUserRole = token.originalUserRole || token.role;
        token.id = session.impersonateUser.id;
        token.role = session.impersonateUser.role;
        token.impersonated = true;
      }

      if (trigger === "update" && session?.stopImpersonation) {
        if (token.originalUserId) {
          token.id = token.originalUserId as string;
          token.role = token.originalUserRole as Role;
          token.impersonated = false;
          token.originalUserId = undefined;
          token.originalUserRole = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        (session.user as any).canAccessLivrets = token.canAccessLivrets ?? false;
        (session.user as any).canManageUsers = token.canManageUsers ?? false;
        (session.user as any).canManageSettings = token.canManageSettings ?? false;
        (session.user as any).canManagePlanning = token.canManagePlanning ?? false;
        (session.user as any).canManageRH = token.canManageRH ?? false;
        (session as any).impersonated = !!token.impersonated;
        (session as any).originalUserId = token.originalUserId as string | undefined;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      if (user?.id) {
        await updateLoginStreak(user.id);
      }
    },
  },

  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? `__Secure-next-auth.session-token` 
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
