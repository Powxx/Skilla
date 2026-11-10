import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

/**
 * Contrôles d'autorisation centralisés.
 *
 * Modèle de droits :
 * - SUPER_ADMIN et administrateur général (`isGeneralAdmin`) : tous les droits ;
 * - ADMIN : accès à l'administration, et aux domaines sensibles uniquement s'il possède
 *   la permission fine correspondante (cochée par l'administrateur général) ;
 * - autres rôles : aucun droit d'administration.
 *
 * Les permissions sont portées par la session, revalidée en base toutes les 60 s (voir auth-options).
 */

export type AdminPermission =
  | "canManageUsers"
  | "canManageSettings"
  | "canManagePlanning"
  | "canManageRH";

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  canManageUsers: "Gestion des utilisateurs",
  canManageSettings: "Configuration système",
  canManagePlanning: "Gestion de l'emploi du temps",
  canManageRH: "Gestion RH & contrats",
};

type SessionUser = Session["user"] | null | undefined;

export function isAdminUser(user: SessionUser): boolean {
  return user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
}

/** SUPER_ADMIN ou administrateur général : tous les droits. */
export function isGeneralAdminUser(user: SessionUser): boolean {
  return user?.role === "SUPER_ADMIN" || Boolean(user?.isGeneralAdmin);
}

/** Vérifie qu'un utilisateur d'administration possède une permission fine. */
export function hasAdminPermission(user: SessionUser, permission: AdminPermission): boolean {
  if (!isAdminUser(user)) return false;
  if (isGeneralAdminUser(user)) return true;
  return Boolean(user?.[permission]);
}

export function permissionDeniedMessage(permission: AdminPermission): string {
  return `Permission « ${PERMISSION_LABELS[permission]} » requise.`;
}

/** Retourne la session si l'utilisateur est admin, sinon `null`. */
export async function getAdminSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id && isAdminUser(session.user) ? session : null;
}

/** Retourne la session si l'utilisateur possède la permission fine, sinon `null`. */
export async function getSessionWithPermission(permission: AdminPermission): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id && hasAdminPermission(session.user, permission) ? session : null;
}

/** Variante qui lève une erreur, pour les Server Actions qui signalent les refus par exception. */
export async function requirePermission(permission: AdminPermission): Promise<Session> {
  const session = await getSessionWithPermission(permission);
  if (!session) throw new Error(permissionDeniedMessage(permission));
  return session;
}

/**
 * Garde de page serveur : non-admin → /login, admin sans la permission → /admin.
 * À appeler en tête des pages d'administration sensibles.
 */
export async function requirePagePermission(permission: AdminPermission): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminUser(session.user)) redirect("/login");
  if (!hasAdminPermission(session.user, permission)) redirect("/admin");
  return session;
}
