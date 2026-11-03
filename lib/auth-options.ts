import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { updateLoginStreak } from "@/lib/login-streak";
import { formatUserName } from "@/lib/user-utils";

/** Message renvoyé au formulaire de connexion pour un compte désactivé (mot de passe correct). */
export const ACCOUNT_DISABLED_ERROR = "Compte désactivé. Veuillez contacter l'administration.";

/** Nombre d'échecs de connexion consécutifs avant verrouillage temporaire du compte. */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
/** Durée du verrouillage du compte après trop d'échecs. */
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

/** Intervalle de revalidation des droits du JWT en base (rôle, permissions, compte actif). */
const TOKEN_REFRESH_INTERVAL_MS = 60 * 1000;

const PERMISSION_SELECT = {
  role: true,
  firstName: true,
  lastName: true,
  isActive: true,
  canAccessLivrets: true,
  canManageUsers: true,
  canManageSettings: true,
  canManagePlanning: true,
  canManageRH: true,
  canImpersonate: true,
  isGeneralAdmin: true,
} as const;

/**
 * Recharge depuis la base les droits portés par le JWT.
 * Sans cela, un compte désactivé ou rétrogradé conserverait ses droits jusqu'à l'expiration du jeton (24h).
 * Retourne `null` si la session doit être révoquée.
 */
async function refreshTokenFromDb(token: JWT): Promise<JWT | null> {
  const actorId = (token.originalUserId as string | undefined) || token.id;
  if (!actorId) return null;

  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: PERMISSION_SELECT });
  if (!actor || !actor.isActive) return null;

  const isGenAdmin = Boolean(actor.isGeneralAdmin || actor.role === "SUPER_ADMIN");
  token.canAccessLivrets = actor.canAccessLivrets;
  token.canManageUsers = actor.canManageUsers;
  token.canManageSettings = actor.canManageSettings;
  token.canManagePlanning = actor.canManagePlanning;
  token.canManageRH = actor.canManageRH;
  token.canImpersonate = actor.canImpersonate || isGenAdmin;
  token.isGeneralAdmin = isGenAdmin;

  if (token.impersonated && token.originalUserId) {
    token.originalUserRole = actor.role;
    token.originalUserName = formatUserName(actor.firstName, actor.lastName);

    const target = await prisma.user.findUnique({ where: { id: token.id }, select: PERMISSION_SELECT });
    const stillAllowed =
      Boolean(token.canImpersonate) &&
      target?.isActive &&
      (target.role !== "SUPER_ADMIN" || actor.role === "SUPER_ADMIN");

    if (target && stillAllowed) {
      token.role = target.role;
      token.name = formatUserName(target.firstName, target.lastName);
    } else {
      // Usurpation plus autorisée : retour à l'identité d'origine
      token.id = actorId;
      token.role = actor.role;
      token.name = token.originalUserName as string;
      token.impersonated = false;
      token.originalUserId = undefined;
      token.originalUserRole = undefined;
      token.originalUserName = undefined;
    }
  } else {
    token.role = actor.role;
    token.name = formatUserName(actor.firstName, actor.lastName);
  }

  token.refreshedAt = Date.now();
  return token;
}

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
              canImpersonate: true,
              isGeneralAdmin: true,
              isActive: true,
              failedLoginAttempts: true,
              lockedUntil: true
            }
          });

          if (!user || !user.password) return null;
          
          // Compte temporairement verrouillé après trop d'échecs (anti brute-force)
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            return null;
          }

          // Comparaison du hash du mot de passe stocké en BDD
          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (!isPasswordValid) {
            const attempts = (user.failedLoginAttempts ?? 0) + 1;
            const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
            await prisma.user.update({
              where: { id: user.id },
              data: shouldLock
                ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOGIN_LOCK_DURATION_MS) }
                : { failedLoginAttempts: attempts },
            }).catch((err) => {
              console.error("Erreur lors de l'enregistrement de l'échec de connexion:", err);
            });
            return null;
          }

          // Vérification si le compte a été suspendu par l'administration.
          // Fait APRÈS la vérification du mot de passe pour ne pas révéler l'état d'un compte sans ses identifiants.
          if (user.isActive === false) {
            throw new Error(ACCOUNT_DISABLED_ERROR);
          }

          // Remise à zéro des échecs (lastLoginAt est mis à jour par updateLoginStreak dans events.signIn)
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          }).catch((err) => {
            console.error("Erreur lors de la mise à jour de lastLoginAt:", err);
          });

          const isGenAdmin = Boolean(user.isGeneralAdmin || user.role === "SUPER_ADMIN");

          // Retourne l'objet User décoré de ses habilitations RBAC qui sera encrypté dans le JWT
          return {
            id: user.id,
            email: user.email,
            name: formatUserName(user.firstName, user.lastName),
            role: user.role,
            canAccessLivrets: user.canAccessLivrets,
            canManageUsers: user.canManageUsers,
            canManageSettings: user.canManageSettings,
            canManagePlanning: user.canManagePlanning,
            canManageRH: user.canManageRH,
            canImpersonate: user.canImpersonate || isGenAdmin,
            isGeneralAdmin: isGenAdmin,
          };
          
        } catch (error) {
          // Seul le message de compte désactivé est remonté au formulaire ; toute autre erreur reste générique
          if (error instanceof Error && error.message === ACCOUNT_DISABLED_ERROR) {
            throw error;
          }
          console.error("[auth] Erreur lors de la connexion:", error);
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
        token.name = user.name;
        token.canAccessLivrets = user.canAccessLivrets ?? false;
        token.canManageUsers = user.canManageUsers ?? false;
        token.canManageSettings = user.canManageSettings ?? false;
        token.canManagePlanning = user.canManagePlanning ?? false;
        token.canManageRH = user.canManageRH ?? false;
        token.canImpersonate = user.canImpersonate ?? false;
        token.isGeneralAdmin = user.isGeneralAdmin ?? false;
        token.refreshedAt = Date.now();
      }

      // Mécanisme d'usurpation d'identité (Impersonate) :
      // Permet UNIQUEMENT à un utilisateur autorisé d'endosser le rôle d'un autre utilisateur
      if (trigger === "update" && session?.impersonateUser) {
        const canUserImpersonate = Boolean(
          token.canImpersonate ||
          token.role === "SUPER_ADMIN" ||
          token.originalUserRole === "SUPER_ADMIN"
        );
        if (canUserImpersonate && session.impersonateUser.id) {
          const target = await prisma.user.findUnique({
            where: { id: session.impersonateUser.id },
            select: { id: true, role: true, firstName: true, lastName: true, isActive: true }
          });
          // Un SUPER_ADMIN ne peut être usurpé que par un autre SUPER_ADMIN (anti-élévation de privilèges)
          const actorRole = token.originalUserRole || token.role;
          const canTarget = target?.role !== "SUPER_ADMIN" || actorRole === "SUPER_ADMIN";
          if (target && target.isActive && canTarget) {
            token.originalUserId = token.originalUserId || token.id;
            token.originalUserRole = token.originalUserRole || token.role;
            token.originalUserName = token.originalUserName || token.name || undefined;

            token.id = target.id;
            token.role = target.role;
            token.name = formatUserName(target.firstName, target.lastName);
            token.impersonated = true;
          }
        }
      }

      // Arrêt de l'usurpation d'identité : restauration de l'identité d'origine
      if (trigger === "update" && session?.stopImpersonation) {
        if (token.originalUserId) {
          token.id = token.originalUserId as string;
          token.role = token.originalUserRole as Role;
          token.name = token.originalUserName as string;
          token.impersonated = false;
          token.originalUserId = undefined;
          token.originalUserRole = undefined;
          token.originalUserName = undefined;
        }
      }

      // Revalidation périodique des droits en base (compte désactivé, rôle ou permissions modifiés)
      const forceRefresh = trigger === "update";
      const lastRefresh = typeof token.refreshedAt === "number" ? token.refreshedAt : 0;
      if (token.id && !token.revoked && (forceRefresh || Date.now() - lastRefresh > TOKEN_REFRESH_INTERVAL_MS)) {
        try {
          const refreshed = await refreshTokenFromDb(token);
          if (!refreshed) {
            // Session révoquée : on ne conserve aucune identité ni aucun droit
            return { revoked: true } as unknown as JWT;
          }
          return refreshed;
        } catch (err) {
          // En cas d'indisponibilité de la base, on conserve le jeton existant jusqu'à la prochaine tentative
          console.error("[auth] Revalidation du jeton impossible:", err);
        }
      }

      return token;
    },
    // Exécuté lors de la vérification de la session par le client
    async session({ session, token }) {
      if (token.revoked || !token.id) {
        // Session révoquée (compte désactivé ou supprimé) : aucune identité exposée
        return { ...session, user: undefined } as unknown as typeof session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        if (token.name) {
          session.user.name = token.name as string;
        }
        session.user.canAccessLivrets = token.canAccessLivrets ?? false;
        session.user.canManageUsers = token.canManageUsers ?? false;
        session.user.canManageSettings = token.canManageSettings ?? false;
        session.user.canManagePlanning = token.canManagePlanning ?? false;
        session.user.canManageRH = token.canManageRH ?? false;
        session.user.canImpersonate = token.canImpersonate ?? false;
        session.user.isGeneralAdmin = token.isGeneralAdmin ?? false;
        session.impersonated = !!token.impersonated;
        session.originalUserId = token.originalUserId as string | undefined;
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
