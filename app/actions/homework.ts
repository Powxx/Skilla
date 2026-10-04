"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Permet à un élève de cocher / décocher un devoir comme fait.
 * Enregistré en base de données pour permettre la synchronisation multi-appareils
 * et alimenter les statistiques de préparation du professeur.
 */
export async function toggleStudentHomeworkDone(lessonId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non authentifié");
  }

  const studentId = session.user.id;

  const existing = await prisma.homeworkCompletion.findUnique({
    where: {
      lessonId_studentId: {
        lessonId,
        studentId,
      },
    },
  });

  let isDone = false;
  if (existing) {
    await prisma.homeworkCompletion.delete({
      where: { id: existing.id },
    });
    isDone = false;
  } else {
    await prisma.homeworkCompletion.create({
      data: {
        lessonId,
        studentId,
      },
    });
    isDone = true;
  }

  revalidatePath("/student/devoirs");
  revalidatePath("/student/dashboard");
  revalidatePath("/prof/devoirs");
  revalidatePath("/admin/devoirs");

  return { isDone };
}

/**
 * Récupère l'ensemble des IDs de devoirs cochés comme faits par l'élève connecté.
 */
export async function getStudentCompletedHomeworkIds(): Promise<string[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const completions = await prisma.homeworkCompletion.findMany({
    where: { studentId: session.user.id },
    select: { lessonId: true },
  });

  return completions.map((c) => c.lessonId);
}

/**
 * Récupère le détail des élèves ayant réalisé un devoir pour une leçon donnée.
 * Utilisé par le professeur ou l'administrateur pour visualiser les statistiques de la classe.
 */
export async function getLessonHomeworkStats(lessonId: string) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "TEACHER" &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Non autorisé");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      class: {
        include: {
          students: {
            select: { id: true, firstName: true, lastName: true },
            orderBy: { lastName: "asc" },
          },
        },
      },
      homeworkCompletions: {
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!lesson) {
    throw new Error("Cours non trouvé");
  }

  const classStudents = lesson.class?.students || [];
  const completedList: { id: string; name: string; completedAt: string }[] = [];
  const completedStudentIds = new Set<string>();

  lesson.homeworkCompletions.forEach((hc) => {
    const studentName = hc.student
      ? `${hc.student.lastName || ""} ${hc.student.firstName || ""}`.trim()
      : "Élève";
    completedList.push({
      id: hc.studentId,
      name: studentName || "Élève",
      completedAt: hc.completedAt.toISOString(),
    });
    completedStudentIds.add(hc.studentId);
  });

  const pendingList = classStudents
    .filter((s) => !completedStudentIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: `${s.lastName || ""} ${s.firstName || ""}`.trim() || "Élève",
    }));

  const total = Math.max(classStudents.length, completedList.length);
  const done = completedList.length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    lessonId,
    totalStudents: total,
    completedCount: done,
    completionRate: rate,
    completedList,
    pendingList,
  };
}

/**
 * Permet à un enseignant ou à un administrateur d'inverser manuellement le statut d'un élève
 * (utile si l'élève a rendu sur papier ou pour régulariser).
 */
export async function adminToggleStudentHomeworkDone(lessonId: string, targetStudentId: string) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "TEACHER" &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Non autorisé");
  }

  const existing = await prisma.homeworkCompletion.findUnique({
    where: {
      lessonId_studentId: {
        lessonId,
        studentId: targetStudentId,
      },
    },
  });

  let isDone = false;
  if (existing) {
    await prisma.homeworkCompletion.delete({
      where: { id: existing.id },
    });
    isDone = false;
  } else {
    await prisma.homeworkCompletion.create({
      data: {
        lessonId,
        studentId: targetStudentId,
      },
    });
    isDone = true;
  }

  revalidatePath("/student/devoirs");
  revalidatePath("/student/dashboard");
  revalidatePath("/prof/devoirs");
  revalidatePath("/admin/devoirs");

  return { isDone };
}

