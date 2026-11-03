import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      canAccessLivrets: boolean;
      canManageUsers: boolean;
      canManageSettings: boolean;
      canManagePlanning: boolean;
      canManageRH: boolean;
      canImpersonate: boolean;
      isGeneralAdmin: boolean;
    } & DefaultSession["user"];
    /** Vrai si un administrateur a pris l'identité de cet utilisateur. */
    impersonated?: boolean;
    /** Identifiant de l'administrateur d'origine pendant une usurpation. */
    originalUserId?: string;
  }

  /** Objet utilisateur renvoyé par Credentials `authorize`. */
  interface User {
    role: Role;
    canAccessLivrets: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
    canManagePlanning: boolean;
    canManageRH: boolean;
    canImpersonate: boolean;
    isGeneralAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    canAccessLivrets: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
    canManagePlanning: boolean;
    canManageRH: boolean;
    canImpersonate?: boolean;
    isGeneralAdmin?: boolean;
    /** Usurpation d'identité en cours. */
    impersonated?: boolean;
    originalUserId?: string;
    originalUserRole?: Role;
    originalUserName?: string;
    /** Horodatage (ms) de la dernière revalidation des droits en base. */
    refreshedAt?: number;
    /** Session révoquée (compte désactivé ou supprimé). */
    revoked?: boolean;
  }
}
