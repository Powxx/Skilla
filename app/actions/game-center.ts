"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function getAllPersonalBests(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return {};

  const isSelf = session.user.id === userId;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSelf && !isAdmin) {
    return {};
  }

  const scores = await prisma.gameScore.findMany({
    where: { userId },
    select: { gameKey: true, score: true }
  });
  
  const scoreMap: Record<string, number> = {};
  scores.forEach(s => {
    scoreMap[s.gameKey] = s.score;
  });
  
  return scoreMap;
}
