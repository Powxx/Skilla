import type { NextAuthOptions } from "next-auth";
import type { Role } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { updateLoginStreak } from "@/app/actions/gamification";

/**
 * Options de configuration de NextAuth pour la plateforme Skilla.
 * Gère le cycle de vie de l'authentification : login par identifiant ou email,
 * stratégie de session par JWT, usurpation d'identité (impersonation), et streak d'assiduité.
 */
export const authOptions: NextAuthOptions = {
  // Chemins personnalisés pour les pages de connexion et de retour d'erreur
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Stratégie de stockage de session basée sur les JSON Web Tokens (JWT) expirant après 24h
  session: { 
    strategy: "jwt", 
    maxAge: 24 * 60 * 60 // 24 heures en secondes
  },
  secret: process.env.NEXTAUTH_SECRET,
  
  providers: [
    // Connexion classique par formulaire (Identifiant/Email + Mot de passe)
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        username: { label: "Identifiant", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          const usernameRaw = credentials?.username?.trim();
          const password = credentials?.password;

          if (!usernameRaw || !password) return null;

          // Convertit l'identifiant en minuscules pour éviter les soucis de casse
          const loginIdentifier = usernameRaw.toLowerCase();
          
          // Recherche l'utilisateur soit par son nom d'utilisateur, soit par son e-mail
          const user = await prisma.user.findFirst({ 
            where: {
              OR: [
                { username: loginIdentifier },
                { email: loginIdentifier }
              ]
            },
            select: { 
              id: true, 
              email: true, 
              username: true,
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
          
          // Vérification si le compte a été suspendu par l'administration
          if (user.isActive === false) {
            throw new Error("Compte désactivé. Veuillez contacter l'administration.");
          }

          // Comparaison du hash du mot de passe stocké en BDD
          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (!isPasswordValid) return null;

          // Retourne l'objet User décoré de ses habilitations RBAC qui sera encrypté dans le JWT
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
    // Exécuté lors de la création ou de la mise à jour du JSON Web Token
    async jwt({ token, user, trigger, session }) {
      // Étape initiale lors du premier login réussi
      if (user) {
        token.role = user.role as Role;
        token.id = user.id;
        token.canAccessLivrets = (user as any).canAccessLivrets ?? false;
        token.canManageUsers = (user as any).canManageUsers ?? false;
        token.canManageSettings = (user as any).canManageSettings ?? false;
        token.canManagePlanning = (user as any).canManagePlanning ?? false;
        token.canManageRH = (user as any).canManageRH ?? false;
      }

      // Mécanisme d'usurpation d'identité (Impersonate) :
      // Permet à un admin d'endosser le rôle d'un autre utilisateur
      if (trigger === "update" && session?.impersonateUser) {
        // Sauvegarde de l'identité originale de l'admin pour pouvoir y revenir
        token.originalUserId = token.originalUserId || token.id;
        token.originalUserRole = token.originalUserRole || token.role;
        // Remplacement par la cible usurpée
        token.id = session.impersonateUser.id;
        token.role = session.impersonateUser.role;
        token.impersonated = true;
      }

      // Arrêt de l'usurpation d'identité : restauration de l'identité d'origine
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
    // Exécuté lors de la vérification de la session par le client
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
    // Événement déclenché à la connexion d'un utilisateur
    async signIn({ user }) {
      if (user?.id) {
        // Met à jour la série de connexions quotidiennes de l'élève (streak de gamification)
        await updateLoginStreak(user.id);
      }
    },
  },

  // Sécurisation des cookies en production (HTTPS requis et SameSite lax)
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
