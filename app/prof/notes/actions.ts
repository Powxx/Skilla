"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";

/**
 * Type pour les données envoyées par le client.
 * L'ajout de lessonId est crucial pour lier l'absence à une séance.
 */
export type SubmitRollPayload = {
  classId: string;
  lessonId: string; 
  markings: Record<string, "present" | "absent" | "late">;
};

export type SubmitRollResult =
  | { ok: true; created: number }
  | { ok: false; error: string };

/**
 * Enregistre les absences et retards dans la base de données.
 */
export async function submitRollCall(payload: SubmitRollPayload): Promise<SubmitRollResult> {
  const session = await getServerSession(authOptions);

  // 1. Sécurité : Seul un enseignant peut faire l'appel
  if (!session?.user || session.user.role !== "TEACHER") {
    return { ok: false, error: "Accès réservé aux enseignants." };
  }

  const { classId, lessonId, markings } = payload;

  if (!classId || !lessonId) {
    return { ok: false, error: "La classe et la leçon sont obligatoires." };
  }

  // 2. Récupération des élèves de la classe
  const classe = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      students: { select: { id: true } },
    },
  });

  if (!classe) {
    return { ok: false, error: "Classe introuvable." };
  }

  // 3. Préparation du tableau d'insertion Prisma
  const toCreate = classe.students
    .filter((student) => markings[student.id] && markings[student.id] !== "present")
    .map((student) => {
      const mark = markings[student.id];
      
      return {
        studentId: student.id,
        lessonId: lessonId, //
        // Conversion explicite vers l'Enum AttendanceStatus
        status: (mark === "late" ? "LATE" : "ABSENT") as AttendanceStatus,
      };
    });

  if (toCreate.length === 0) {
    return { ok: true, created: 0 };
  }

  try {
    // 4. Insertion groupée (createMany) pour optimiser les performances
    await prisma.attendance.createMany({
      data: toCreate,
      skipDuplicates: true, // Évite les erreurs si l'appel est validé deux fois
    });

    // 5. Rafraîchissement des données côté client
    revalidatePath("/prof/appel");
    revalidatePath("/student/absences");

    return { ok: true, created: toCreate.length };
  } catch (error) {
    console.error("Erreur Prisma submitRollCall:", error);
    return { ok: false, error: "Une erreur est survenue lors de l'enregistrement." };
  }
}
export type StudentForGradeEntry = {
  id: string;
  user: {
    firstName: string | null;
    lastName: string | null;
  };
};

export async function getStudentsByClass(classId: string): Promise<StudentForGradeEntry[]> {
  const students = await prisma.studentProfile.findMany({
    where: { classId: classId },
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      user: {
        lastName: "asc",
      },
    },
  });

  return students;
}