"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

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
  
  if (!session?.user || session.user.role !== "TEACHER") {
    return { ok: false, error: "Accès réservé aux enseignants." };
  }

  try {
    await prisma.attendance.update({
      where: { id: attendanceId },
      data: { status: status as AttendanceStatus },
    });
    
    revalidatePath("/prof/appel");
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
  if (!session?.user || session.user.role !== "TEACHER") {
    return { ok: false, error: "Accès réservé aux enseignants." };
  }

  const { classId, lessonId, markings, lateDurations = {} } = payload;

  if (!classId || !lessonId) {
    return { ok: false, error: "Classe et Leçon requises." };
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
    // 4. Insertion des présences
    await prisma.attendance.createMany({
      data: toCreate,
      skipDuplicates: true,
    });

    // 5. Marquage du cours comme validé
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { isAttendanceValidated: true }
    });

    // 6. Envoi des notifications
    const [isAbsenceEnabled, isLateEnabled] = await Promise.all([
      checkEventEnabled("ABSENCE_ALERT"),
      checkEventEnabled("LATE_ALERT")
    ]);

    for (const item of toCreate) {
      if (item.status === "ABSENT" && isAbsenceEnabled) {
        // Fetch student and responsibles/tutors
        const student = await prisma.user.findUnique({
          where: { id: item.studentId },
          include: { responsibles: true, studentContracts: { include: { tutor: true } } }
        });
        
        if (student) {
          const targets = [student.id, ...student.responsibles.map(r => r.id), ...student.studentContracts.map(c => c.tutorId)];
          for (const targetId of targets) {
            createNotification({
              userId: targetId,
              title: "Alerte Absence",
              message: `Une absence a été signalée pour ${student.firstName} ${student.lastName} aujourd'hui.`,
              type: "WARNING",
              link: student.role === "STUDENT" ? "/student/absences" : undefined
            }).catch(e => console.error(e));
          }
        }
      } else if (item.status === "LATE" && isLateEnabled) {
        const student = await prisma.user.findUnique({
          where: { id: item.studentId },
          include: { responsibles: true }
        });

        if (student) {
          const targets = [student.id, ...student.responsibles.map(r => r.id)];
          for (const targetId of targets) {
            createNotification({
              userId: targetId,
              title: "Alerte Retard",
              message: `Un retard de ${item.lateDuration} minutes a été signalé pour ${student.firstName} ${student.lastName}.`,
              type: "WARNING",
              link: student.role === "STUDENT" ? "/student/absences" : undefined
            }).catch(e => console.error(e));
          }
        }
      }
    }

    // 7. Revalidation du cache pour mettre à jour les interfaces
    revalidatePath("/prof/appel");
    revalidatePath("/student/absences");

    return { ok: true, created: toCreate.length };
  } catch (error) {
    console.error("Erreur lors de la création des absences:", error);
    return { ok: false, error: "Erreur lors de l'enregistrement en base de données." };
  }
}