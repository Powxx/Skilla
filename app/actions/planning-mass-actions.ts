"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { addWeeks, isSameDay, setHours, setMinutes } from "date-fns";

export async function massDeleteLessons(afterDateStr: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Non autorisé");
  }

  const afterDate = new Date(afterDateStr);

  // Supprimer d'abord les demandes de remplacement liées
  await prisma.substitutionRequest.deleteMany({
    where: {
      lesson: {
        startTime: {
          gte: afterDate,
        },
      },
    },
  });

  const { count } = await prisma.lesson.deleteMany({
    where: {
      startTime: {
        gte: afterDate,
      },
    },
  });

  revalidatePath("/admin/planning");
  return { success: true, count };
}

export async function massDuplicateLessons(
  sourceStartStr: string,
  sourceEndStr: string,
  filters: { classId?: string; teacherId?: string; roomId?: string },
  occurrences: number,
  intervalWeeks: number
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Non autorisé");
  }

  const sourceStart = new Date(sourceStartStr);
  const sourceEnd = new Date(sourceEndStr);

  const whereClause: any = {
    startTime: {
      gte: sourceStart,
      lte: sourceEnd,
    },
  };

  if (filters.classId) whereClause.classId = filters.classId;
  if (filters.teacherId) whereClause.teacherId = filters.teacherId;
  if (filters.roomId) whereClause.roomId = filters.roomId;

  const sourceLessons = await prisma.lesson.findMany({
    where: whereClause,
  });

  if (sourceLessons.length === 0) {
    throw new Error("Aucun cours trouvé dans cette période avec ces filtres.");
  }

  const holidays = await prisma.holiday.findMany();
  const creations: any[] = [];
  const errors: string[] = [];

  for (const lesson of sourceLessons) {
    let weeksAdded = 1; // On commence à 1 (la première occurence copiée sera +1 * intervalWeeks)
    let duplicatedCount = 0;

    const recurrenceId = occurrences > 1 ? `rec_${crypto.randomUUID()}` : null;

    while (duplicatedCount < occurrences) {
      const nextStart = addWeeks(lesson.startTime, weeksAdded * intervalWeeks);
      const nextEnd = addWeeks(lesson.endTime, weeksAdded * intervalWeeks);

      // Check holidays
      const isHoliday = holidays.some((h) => isSameDay(new Date(h.date), nextStart));
      if (isHoliday) {
        weeksAdded++;
        continue;
      }

      // We could add more strict conflict checking here, 
      // but to keep it performant and simple for bulk copy, we just queue creation.
      creations.push({
        startTime: nextStart,
        endTime: nextEnd,
        isCancelled: false,
        isFreeLesson: lesson.isFreeLesson,
        customSubject: lesson.customSubject,
        customTeacher: lesson.customTeacher,
        subjectId: lesson.subjectId,
        teacherId: lesson.teacherId,
        classId: lesson.classId,
        roomId: lesson.roomId,
        groupId: lesson.groupId,
        recurrenceId: recurrenceId,
      });

      duplicatedCount++;
      weeksAdded++;
    }
  }

  // Create all
  if (creations.length > 0) {
    await prisma.lesson.createMany({
      data: creations,
    });
  }

  revalidatePath("/admin/planning");
  return { success: true, duplicatedLessons: creations.length };
}
