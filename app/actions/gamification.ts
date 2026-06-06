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
  const currentBest = await prisma.gameScore.findUnique({
    where: { userId_gameKey: { userId, gameKey } },
    select: { score: true }
  });

  if (!currentBest || score > currentBest.score) {
    return await prisma.gameScore.upsert({
      where: { userId_gameKey: { userId, gameKey } },
      update: { score },
      create: { userId, gameKey, score }
    });
  }
  return currentBest;
}

export async function getStudentStats(userId: string) {
  const [user, grades] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { loginStreak: true, classId: true }
    }),
    prisma.grade.findMany({
      where: { studentId: userId },
      select: { value: true, coefficient: true }
    })
  ]);

  if (!user) throw new Error("Utilisateur non trouvé");

  const totalPoints = grades.reduce((acc, g) => acc + (g.value * g.coefficient), 0);
  const totalCoeff = grades.reduce((acc, g) => acc + g.coefficient, 0);
  const average = totalCoeff > 0 ? totalPoints / totalCoeff : 0;

  return {
    streak: user.loginStreak,
    classId: user.classId,
    average: average
  };
}

export async function getLeaderboard(gameKey: string, classId?: string) {
  const where: any = { gameKey };
  if (classId) {
    where.user = { classId };
  }

  const scores = await prisma.gameScore.findMany({
    where,
    orderBy: { score: "desc" },
    take: 10,
    include: {
      user: {
        select: { 
          firstName: true, 
          lastName: true,
          class: { select: { name: true } }
        }
      }
    }
  });

  return scores.map(s => ({
    id: s.id,
    score: s.score,
    userName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || 'Anonyme',
    className: s.user?.class?.name || 'N/A',
    createdAt: s.createdAt
  }));
}

export async function getPersonalBest(userId: string, gameKey: string) {
  const best = await prisma.gameScore.findFirst({
    where: { userId, gameKey },
    orderBy: { score: "desc" },
    select: { score: true }
  });
  return best?.score || 0;
}
