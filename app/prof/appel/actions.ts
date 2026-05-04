"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";

// Types pour le payload
export type SubmitRollPayload = {
  classId: string;
  lessonId: string;
  markings: Record<string, "present" | "absent" | "late">;
  lateDurations?: Record<string, number>; // Durée en minutes pour les retards
};

export type SubmitRollResult =
  | { ok: true; created: number }
  | { ok: false; error: string };

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
  // On ne garde que ceux qui ne sont pas présents (absents ou en retard)
  const toCreate = classe.students
    .filter((student) => markings[student.id] && markings[student.id] !== "present")
    .map((student) => {
      const mark = markings[student.id];
      
      return {
        studentId: student.id,
        lessonId: lessonId,
        status: (mark === "late" ? "LATE" : "ABSENT") as AttendanceStatus,
        lateDuration: mark === "late" ? (lateDurations[student.id] || 0) : null,
      };
    });

  if (toCreate.length === 0) {
    return { ok: true, created: 0 };
  }

  try {
    // 4. Insertion en base de données
    await prisma.attendance.createMany({
      data: toCreate,
      skipDuplicates: true, // Évite les erreurs si on soumet deux fois
    });

    // 5. Revalidation du cache pour mettre à jour les interfaces
    revalidatePath("/prof/appel");
    revalidatePath("/student/absences");

    return { ok: true, created: toCreate.length };
  } catch (error) {
    console.error("Erreur lors de la création des absences:", error);
    return { ok: false, error: "Erreur lors de l'enregistrement en base de données." };
  }
}