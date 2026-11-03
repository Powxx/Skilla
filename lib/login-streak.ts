import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, isSameDay } from "date-fns";

/**
 * Met à jour la série de connexions quotidiennes (usage serveur interne, appelé à la connexion).
 * Ne pas placer dans un fichier "use server" : la fonction n'a aucun contrôle d'accès.
 */
export async function updateLoginStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true, loginStreak: true }
  });

  if (!user) return;

  const now = new Date();
  const today = startOfDay(now);
  const lastLogin = user.lastLoginAt ? startOfDay(user.lastLoginAt) : null;

  if (lastLogin && isSameDay(today, lastLogin)) {
    // Déjà connecté aujourd'hui, on ne fait rien
    return;
  }

  const yesterday = subDays(today, 1);
  let newStreak = 1;

  if (lastLogin && isSameDay(yesterday, lastLogin)) {
    // Connecté hier, on incrémente la série
    newStreak = user.loginStreak + 1;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: now,
      loginStreak: newStreak
    }
  });

  return newStreak;
}
