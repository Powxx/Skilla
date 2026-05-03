"use server";

import prisma from "@/lib/prisma";

export type GradeBatchEntry = {
  studentId: string;
  /** Valeur numérique de la note (ex. /20 selon vos règles métier). */
  note: number;
  /** Identifiant Prisma `Subject` (matière). */
  matiereId: string;
  coefficient?: number;
  comment?: string | null;
};

export type SaveGradeBatchSuccess = { ok: true; count: number };
export type SaveGradeBatchFailure = {
  ok: false;
  error: string;
};

export type SaveGradeBatchResult =
  | SaveGradeBatchSuccess
  | SaveGradeBatchFailure;

/**
 * Enregistre un lot de lignes dans `Grade`.
 * Utilise `matiereId` pour résoudre le libellé stocké dans `subjectName`.
 */
export async function saveGradesBatch(
  entries: GradeBatchEntry[],
): Promise<SaveGradeBatchResult> {
  try {
    if (!entries.length) {
      return {
        ok: false,
        error: "La liste est vide — rien à enregistrer.",
      };
    }

    for (const row of entries) {
      const coef =
        row.coefficient === undefined ? 1 : Number(row.coefficient);
      if (
        !row.studentId?.trim() ||
        !Number.isFinite(row.note) ||
        row.note < 0 ||
        row.note > 20 ||
        !Number.isFinite(coef) ||
        !row.matiereId?.trim() ||
        coef <= 0
      ) {
        return {
          ok: false,
          error:
            "Données invalides : élève et matière requis, note entre 0 et 20, coefficient positif.",
        };
      }
    }

    const distinctSubjectIds = [...new Set(entries.map((e) => e.matiereId))];
    const subjects = await prisma.subject.findMany({
      where: { id: { in: distinctSubjectIds } },
      select: { id: true, name: true },
    });

    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
    if (subjectNameById.size !== distinctSubjectIds.length) {
      return {
        ok: false,
        error:
          "Une ou plusieurs matières sont introuvables. Vérifiez les identifiants.",
      };
    }

    const distinctStudentIds = [...new Set(entries.map((e) => e.studentId))];
    const studentRows = await prisma.user.findMany({
      where: { id: { in: distinctStudentIds } },
      select: { id: true },
    });
    const studentKnown = new Set(studentRows.map((s) => s.id));
    for (const id of distinctStudentIds) {
      if (!studentKnown.has(id)) {
        return {
          ok: false,
          error:
            "Un ou plusieurs élèves sont introuvables. Vérifiez les identifiants.",
        };
      }
    }

    await prisma.$transaction(
      entries.map((e) => {
        const commentTrimmed =
          e.comment != null && String(e.comment).trim() !== ""
            ? String(e.comment).trim()
            : null;
        return prisma.grade.create({
          data: {
            studentId: e.studentId,
            value: e.note,
            coefficient: e.coefficient === undefined ? 1 : Number(e.coefficient),
            subjectName: subjectNameById.get(e.matiereId) ?? "",
            comment: commentTrimmed,
            subjectId: e.matiereId, // Utilise l'ID de la matière provenant de ton itération
            semesterId: "TON_ID_DE_SEMESTRE_ICI", // Il faut un ID de semestre valide
          },
        });
      }),
    );

    return { ok: true, count: entries.length };
  } catch (err) {
    console.error("[saveGradesBatch]", err);
    return {
      ok: false,
      error:
        "La sauvegarde des notes a échoué. Réessayez plus tard ou contactez un administrateur.",
    };
  }
}
