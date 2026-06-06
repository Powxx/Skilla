"use server";

import { prisma } from "@/lib/prisma";

export async function getAllPersonalBests(userId: string) {
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
