"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Action réservée aux administrateurs.");
  }
  return session;
}

function revalidateDispensationPaths(studentId: string) {
  revalidatePath(`/admin/students/${studentId}/dispenses`);
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/admin/dispenses`);
  revalidatePath(`/student/grades`);
  revalidatePath(`/prof/notes`);
  revalidatePath(`/admin/report-cards`);
}

/**
 * Active ou désactive la dispense d'un élève pour une matière donnée, avec motif optionnel.
 */
export async function setDispensation(
  studentId: string,
  subjectId: string,
  isDispensed: boolean,
  reason?: string
) {
  try {
    await requireAdmin();

    if (!studentId || !subjectId) {
      return { success: false, error: "Identifiant d'élève ou de matière invalide." };
    }

    if (isDispensed) {
      await prisma.dispensation.upsert({
        where: {
          studentId_subjectId: {
            studentId,
            subjectId,
          },
        },
        update: { reason: reason?.trim() || null },
        create: {
          studentId,
          subjectId,
          reason: reason?.trim() || null,
        },
      });
    } else {
      await prisma.dispensation.deleteMany({
        where: { studentId, subjectId },
      });
    }

    revalidateDispensationPaths(studentId);
    return {
      success: true,
      isDispensed,
      reason: reason?.trim() || null,
      studentId,
      subjectId,
    };
  } catch (error) {
    console.error("Erreur lors de la modification de la dispense:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue.",
    };
  }
}

/**
 * Met à jour le motif d'une dispense existante sans altérer son statut.
 */
export async function updateDispensationReason(
  studentId: string,
  subjectId: string,
  reason: string
) {
  try {
    await requireAdmin();

    if (!studentId || !subjectId) {
      return { success: false, error: "Paramètres manquants." };
    }

    const trimmedReason = reason.trim();

    await prisma.dispensation.upsert({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
      update: { reason: trimmedReason || null },
      create: {
        studentId,
        subjectId,
        reason: trimmedReason || null,
      },
    });

    revalidateDispensationPaths(studentId);
    return { success: true, reason: trimmedReason || null };
  } catch (error) {
    console.error("Erreur mise à jour motif dispense:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue.",
    };
  }
}

/**
 * Dispense ou réactive en masse un ensemble de matières pour un élève.
 */
export async function setBulkDispensations(
  studentId: string,
  subjectIds: string[],
  isDispensed: boolean,
  reason?: string
) {
  try {
    await requireAdmin();

    if (!studentId || !subjectIds || subjectIds.length === 0) {
      return { success: false, error: "Aucune matière sélectionnée." };
    }

    const cleanReason = reason?.trim() || null;

    if (isDispensed) {
      // Upsert pour chaque matière
      await prisma.$transaction(
        subjectIds.map((subjectId) =>
          prisma.dispensation.upsert({
            where: {
              studentId_subjectId: {
                studentId,
                subjectId,
              },
            },
            update: { reason: cleanReason },
            create: {
              studentId,
              subjectId,
              reason: cleanReason,
            },
          })
        )
      );
    } else {
      await prisma.dispensation.deleteMany({
        where: {
          studentId,
          subjectId: { in: subjectIds },
        },
      });
    }

    revalidateDispensationPaths(studentId);
    return { success: true, count: subjectIds.length, isDispensed };
  } catch (error) {
    console.error("Erreur opération groupée dispenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue.",
    };
  }
}

