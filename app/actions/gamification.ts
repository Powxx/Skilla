"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, isSameDay } from "date-fns";

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

export async function saveGameScore(userId: string, gameKey: string, score: number) {
  // On pourrait ajouter des vérifications de sécurité ici pour éviter la triche
  return await prisma.gameScore.create({
    data: {
      userId,
      gameKey,
      score
    }
  });
}

export async function getLeaderboard(gameKey: string, classId?: string) {
  if (classId) {
    // Classement par classe
    return await prisma.gameScore.findMany({
      where: {
        gameKey,
        user: { classId }
      },
      orderBy: { score: "desc" },
      take: 10,
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  } else {
    // Classement école (tous les élèves)
    return await prisma.gameScore.findMany({
      where: { gameKey },
      orderBy: { score: "desc" },
      take: 10,
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }
}
