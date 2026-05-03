import type { NextAuthOptions } from "next-auth";
import type { Role } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
    error: "/login", // Redirige les erreurs vers la page de login
  },
  session: { 
    strategy: "jwt", 
    maxAge: 30 * 24 * 60 * 60 // 30 jours
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

          if (!emailRaw || !password) {
            console.log("DEBUG AUTH: Email ou mot de passe manquant");
            return null;
          }

          const email = emailRaw.toLowerCase();
          
          // 1. Recherche de l'utilisateur
          const user = await prisma.user.findUnique({ 
            where: { email } 
          });

          if (!user) {
            console.log(`DEBUG AUTH: Aucun utilisateur trouvé pour ${email}`);
            return null;
          }

          // 2. Vérification du mot de passe
          if (!user.password) {
            console.log(`DEBUG AUTH: Mot de passe manquant pour ${email}`);
            return null;
          }
          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (!isPasswordValid) {
            console.log(`DEBUG AUTH: Mot de passe incorrect pour ${email}`);
            return null;
          }

          // 3. Retourne l'objet user si tout est OK
          console.log(`DEBUG AUTH: Connexion réussie pour ${email}`);
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            role: user.role,
            
          };
          
        } catch (error) {
          console.error("DEBUG AUTH ERROR:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // S'exécute lors de la connexion initiale
      if (user) {
        console.log("DEBUG JWT: User trouvé lors de la connexion, role =", user.role);
        token.role = user.role as Role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Transmet les infos du JWT vers la session accessible côté client
      if (session.user) {
        console.log("DEBUG SESSION: Token reçu dans la session, role =", token.role);
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },

  // Configuration des cookies pour la production (HTTPS)
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