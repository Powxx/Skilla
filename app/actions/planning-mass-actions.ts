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
  let skippedConflicts = 0;

  // Pré-chargement des cours existants sur la période cible pour éviter les collisions
  const maxWeeks = occurrences * intervalWeeks + 4;
  const maxEndDate = addWeeks(sourceEnd, maxWeeks);
  const existingLessons = await prisma.lesson.findMany({
    where: {
      startTime: { gte: addWeeks(sourceStart, intervalWeeks), lte: maxEndDate },
      isCancelled: false,
    },
    select: { startTime: true, endTime: true, teacherId: true, roomId: true, classId: true }
  });

  const isOverlapping = (startA: Date, endA: Date, startB: Date, endB: Date) =>
    startA < endB && endA > startB;

  for (const lesson of sourceLessons) {
    let weeksAdded = 1; // On commence à 1 (la première occurence copiée sera +1 * intervalWeeks)
    let duplicatedCount = 0;

    const recurrenceId = occurrences > 1 ? `rec_${crypto.randomUUID()}` : null;

    while (duplicatedCount < occurrences && weeksAdded < occurrences * 4) {
      const nextStart = addWeeks(lesson.startTime, weeksAdded * intervalWeeks);
      const nextEnd = addWeeks(lesson.endTime, weeksAdded * intervalWeeks);

      // 1. Vérification des jours fériés
      const isHoliday = holidays.some((h) => isSameDay(new Date(h.date), nextStart));
      if (isHoliday) {
        weeksAdded++;
        continue;
      }

      // 2. Détection préventive des conflits (classe, professeur, salle)
      const hasConflict = [...existingLessons, ...creations].some((existing) => {
        if (!isOverlapping(nextStart, nextEnd, new Date(existing.startTime), new Date(existing.endTime))) {
          return false;
        }
        if (existing.classId === lesson.classId) return true;
        if (lesson.teacherId && existing.teacherId === lesson.teacherId) return true;
        if (lesson.roomId && existing.roomId === lesson.roomId) return true;
        return false;
      });

      if (hasConflict) {
        skippedConflicts++;
        weeksAdded++;
        continue;
      }

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

  // Création par lot en base de données
  if (creations.length > 0) {
    await prisma.lesson.createMany({
      data: creations,
    });
  }

  revalidatePath("/admin/planning");
  return { success: true, duplicatedLessons: creations.length, skippedConflicts };
}

export async function getLessonsForTimeframe(teacherId: string, startStr: string, endStr: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Non autorisé");
  }

  const start = new Date(startStr);
  const end = new Date(endStr);

  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      startTime: {
        gte: start,
      },
      endTime: {
        lte: end,
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      subjectId: true,
      groupId: true,
      classId: true,
    }
  });

  return lessons;
}
