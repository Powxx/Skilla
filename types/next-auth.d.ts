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
    } & DefaultSession["user"];
  }

  /** Objet utilisateur renvoyé par Credentials `authorize`. */
  interface User {
    role: Role;
    canAccessLivrets: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
    canManagePlanning: boolean;
    canManageRH: boolean;
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
  }
}
