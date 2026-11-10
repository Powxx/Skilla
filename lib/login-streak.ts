import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, isSameDay } from "date-fns";

/**
 * Calcule la nouvelle série de connexions quotidiennes.
 * - déjà connecté aujourd'hui : série inchangée (au moins 1)
 * - connecté hier : série + 1
 * - sinon : la série repart à 1
 */
export function computeLoginStreak(lastLoginAt: Date | null, currentStreak: number, now: Date = new Date()): number {
  if (!lastLoginAt) return 1;

  const today = startOfDay(now);
  const lastLogin = startOfDay(lastLoginAt);

  if (isSameDay(today, lastLogin)) return Math.max(currentStreak, 1);
  if (isSameDay(subDays(today, 1), lastLogin)) return currentStreak + 1;
  return 1;
}

/**
 * Met à jour la série de connexions quotidiennes et la date de dernière connexion
 * (usage serveur interne, appelé à la connexion).
 * Ne pas placer dans un fichier "use server" : la fonction n'a aucun contrôle d'accès.
 *
 * Doit être la seule écriture de `lastLoginAt` à la connexion : si la date était mise à jour
 * avant, la série serait toujours considérée « déjà comptée aujourd'hui » et ne progresserait jamais.
 */
export async function updateLoginStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true, loginStreak: true }
  });

  if (!user) return;

  const now = new Date();
  const newStreak = computeLoginStreak(user.lastLoginAt, user.loginStreak, now);

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: now,
      loginStreak: newStreak
    }
  });

  return newStreak;
}
