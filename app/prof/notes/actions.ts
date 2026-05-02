"use server";

import prisma from "@/lib/prisma";

export type StudentForGradeEntry = {
  id: string;
  user: { firstName: string; lastName: string };
};

export async function getStudentsByClass(
  classId: string,
): Promise<StudentForGradeEntry[]> {
  if (!classId.trim()) return [];

  return prisma.student.findMany({
    where: { classId },
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
  });
}
