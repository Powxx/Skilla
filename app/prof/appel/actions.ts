"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

import { getEffectiveTeacherId } from "@/lib/teacher-utils";

// Types pour le payload
export type SubmitRollPayload = {
  classId: string;
  lessonId: string;
  markings: Record<string, "present" | "absent" | "late" | "excused">;
  lateDurations?: Record<string, number>; // Durée en minutes pour les retards
};

export type SubmitRollResult =
  | { ok: true; created: number }
  | { ok: false; error: string };

export async function updateAttendanceStatus(
  attendanceId: string, 
  status: "ABSENT" | "EXCUSED"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, error: "Accès réservé aux enseignants et administrateurs." };
  }

  try {
    await prisma.attendance.update({
      where: { id: attendanceId },
      data: { status: status as AttendanceStatus },
    });
    
    revalidatePath("/prof/appel");
    revalidatePath("/admin/absences");
    return { ok: true };
  } catch (error) {
    console.error("Erreur mise à jour absence:", error);
    return { ok: false, error: "Erreur de mise à jour." };
  }
}

/**
 * Crée les entrées Attendance pour les élèves.
 */
export async function submitRollCall(payload: SubmitRollPayload): Promise<SubmitRollResult> {
  const session = await getServerSession(authOptions);
  
  // 1. Vérification de sécurité
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, error: "Accès réservé aux enseignants et administrateurs." };
  }

  const { classId, lessonId, markings, lateDurations = {} } = payload;

  if (!classId || !lessonId) {
    return { ok: false, error: "Classe et Leçon requises." };
  }

  // 1b. Vérification des droits sur la leçon (en cas de remplacement, seul le remplaçant peut faire l'appel)
  const targetLesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true, substituteId: true }
  });

  if (!targetLesson) {
    return { ok: false, error: "Cours introuvable." };
  }

  const effectiveTeacherId = await getEffectiveTeacherId(session.user.id);
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  const isAuthorizedToRollCall = isAdmin || (
    targetLesson.substituteId
      ? targetLesson.substituteId === effectiveTeacherId
      : targetLesson.teacherId === effectiveTeacherId
  );

  if (!isAuthorizedToRollCall) {
    return { ok: false, error: "Ce cours ne vous est pas assigné ou fait l'objet d'un remplacement." };
  }

  // 2. Vérification de l'existence de la classe et de ses élèves
  const classe = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      students: { select: { id: true } },
    },
  });

  if (!classe) {
    return { ok: false, error: "Classe introuvable." };
  }

  // 3. Préparation des données pour createMany
  // On crée une entrée pour CHAQUE élève pour valider l'appel
  const toCreate = classe.students
    .map((student) => {
      const mark = markings[student.id] || "present";
      
      return {
        studentId: student.id,
        lessonId: lessonId,
        status: (mark === "late" ? "LATE" : mark === "absent" ? "ABSENT" : mark === "excused" ? "EXCUSED" : "PRESENT") as AttendanceStatus,
        lateDuration: mark === "late" ? (lateDurations[student.id] || 0) : null,
      };
    });

  if (toCreate.length === 0) {
    return { ok: true, created: 0 };
  }

  try {
    // 4. Insertion transactionnelle : remplacement propre des émargements pour permettre la rectification
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { lessonId } }),
      prisma.attendance.createMany({ data: toCreate }),
      prisma.lesson.update({
        where: { id: lessonId },
        data: { isAttendanceValidated: true },
      }),
    ]);

    // 5. Envoi optimisé des notifications sans boucle N+1
    const [isAbsenceEnabled, isLateEnabled] = await Promise.all([
      checkEventEnabled("ABSENCE_ALERT"),
      checkEventEnabled("LATE_ALERT"),
    ]);

    const flaggedItems = toCreate.filter(
      (item) =>
        (item.status === "ABSENT" && isAbsenceEnabled) ||
        (item.status === "LATE" && isLateEnabled)
    );

    if (flaggedItems.length > 0) {
      const flaggedIds = [...new Set(flaggedItems.map((i) => i.studentId))];
      const studentsData = await prisma.user.findMany({
        where: { id: { in: flaggedIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          responsibles: { select: { id: true } },
          studentContracts: { select: { tutorId: true } },
        },
      });

      const studentMap = new Map(studentsData.map((s) => [s.id, s]));

      for (const item of flaggedItems) {
        const student = studentMap.get(item.studentId);
        if (!student) continue;

        const studentName = `${(student.lastName || "").toUpperCase()} ${student.firstName || ""}`.trim();

        if (item.status === "ABSENT" && isAbsenceEnabled) {
          const targets = [
            student.id,
            ...student.responsibles.map((r) => r.id),
            ...student.studentContracts.map((c) => c.tutorId),
          ];
          for (const targetId of targets) {
            createNotification({
              userId: targetId,
              title: "Alerte Absence",
              message: `Une absence a été signalée pour ${studentName} aujourd'hui.`,
              type: "WARNING",
              link: student.role === "STUDENT" ? "/student/absences" : undefined,
            }).catch((e) => console.error(e));
          }
        } else if (item.status === "LATE" && isLateEnabled) {
          const targets = [student.id, ...student.responsibles.map((r) => r.id)];
          for (const targetId of targets) {
            createNotification({
              userId: targetId,
              title: "Alerte Retard",
              message: `Un retard de ${item.lateDuration || 0} minutes a été signalé pour ${studentName}.`,
              type: "WARNING",
              link: student.role === "STUDENT" ? "/student/absences" : undefined,
            }).catch((e) => console.error(e));
          }
        }
      }
    }

    // 6. Revalidation du cache pour mettre à jour les interfaces
    revalidatePath("/prof/appel");
    revalidatePath("/student/absences");
    revalidatePath("/admin/absences");

    return { ok: true, created: toCreate.length };
  } catch (error) {
    console.error("Erreur lors de la création des absences:", error);
    return { ok: false, error: "Erreur lors de l'enregistrement en base de données." };
  }
}