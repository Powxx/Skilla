"use server";

import prisma from "@/lib/prisma";
import { createNotification, checkEventEnabled } from "./notifications";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

import { getEffectiveTeacherId } from "@/lib/teacher-utils";

export type GradeBatchEntry = {
  studentId: string;
  note: number;
  matiereId: string;
  coefficient?: number;
  comment?: string | null;
  date?: string | Date;
  semesterId?: string;
  scale?: number;
  originalNote?: number;
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
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return {
      ok: false,
      error: "Non autorisé. Accès réservé aux professeurs et administrateurs.",
    };
  }

  const effectiveTeacherId = await getEffectiveTeacherId(session.user.id);
  const teacherId = session.user.role === "TEACHER" 
    ? session.user.id 
    : (effectiveTeacherId !== session.user.id ? effectiveTeacherId : null);

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
      const rowScale = (row.scale && Number.isFinite(row.scale) && row.scale > 0) ? Number(row.scale) : 20;
      const maxAllowed = Math.max(rowScale, 20);

      if (
        !row.studentId?.trim() ||
        !Number.isFinite(row.note) ||
        row.note < 0 ||
        row.note > maxAllowed ||
        !Number.isFinite(coef) ||
        !row.matiereId?.trim() ||
        coef <= 0
      ) {
        return {
          ok: false,
          error:
            `Données invalides : élève et matière requis, note positive et valide (barème max : ${maxAllowed}), coefficient positif.`,
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

    // Resolve Semesters - Détection automatique prioritaire selon la date de la note
    const semCache = new Map<string, string>(); // date(iso) -> semesterId

    const resolvedEntries = await Promise.all(entries.map(async (e) => {
        const noteDate = e.date ? new Date(e.date) : new Date();
        const dateKey = noteDate.toISOString().split('T')[0];
        
        if (!semCache.has(dateKey)) {
            // 1. Chercher en priorité le semestre dont la période englobe noteDate
            let sem = await prisma.semester.findFirst({
                where: {
                  startDate: { lte: noteDate },
                  endDate: { gte: noteDate }
                },
                select: { id: true }
            });

            // 2. Si non trouvé par date stricte, tester l'identifiant de semestre éventuellement fourni
            if (!sem && e.semesterId) {
                sem = await prisma.semester.findUnique({
                    where: { id: e.semesterId },
                    select: { id: true }
                });
            }

            // 3. Repli de sécurité : dernier semestre actif en base
            if (!sem) {
                sem = await prisma.semester.findFirst({ 
                    orderBy: { startDate: 'desc' },
                    select: { id: true }
                });
            }
            
            if (!sem) throw new Error("Aucun semestre défini en base.");
            semCache.set(dateKey, sem.id);
        }
        return { ...e, semesterId: semCache.get(dateKey)!, noteDate };
    }));

    await prisma.$transaction(
      resolvedEntries.map((e) => {
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
            subjectId: e.matiereId,
            semesterId: e.semesterId,
            teacherId: teacherId,
            createdAt: e.noteDate
          },
        });
      }),
    );

    // Send notifications (non-blocking for the transaction but after success)
    const isEnabled = await checkEventEnabled("NEW_GRADE");
    if (isEnabled) {
      for (const e of entries) {
        const displayScore = (e.originalNote !== undefined && e.scale) 
          ? `${e.originalNote}/${e.scale}` 
          : `${e.note}/20`;

        createNotification({
          userId: e.studentId,
          title: "Nouvelle note disponible",
          message: `Une nouvelle note a été publiée en ${subjectNameById.get(e.matiereId)}. Note : ${displayScore}.`,
          type: "INFO",
          link: "/student/grades"
        }).catch(err => console.error("Failed to send notification:", err));
      }
    }

    revalidatePath("/prof/notes");
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

export async function updateGrade(id: string, value: number, coefficient: number, comment?: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Non autorisé");
  }

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const effectiveTeacherId = await getEffectiveTeacherId(session.user.id);
  const allowedTeacherIds = [session.user.id];
  if (effectiveTeacherId) allowedTeacherIds.push(effectiveTeacherId);

  const whereClause = isAdmin ? { id } : { id, teacherId: { in: allowedTeacherIds } };

  try {
    await prisma.grade.update({
      where: whereClause,
      data: {
        value,
        coefficient,
        comment
      }
    });
    revalidatePath("/prof/notes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Erreur lors de la mise à jour." };
  }
}

export async function deleteGrade(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Non autorisé");
  }

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const effectiveTeacherId = await getEffectiveTeacherId(session.user.id);
  const allowedTeacherIds = [session.user.id];
  if (effectiveTeacherId) allowedTeacherIds.push(effectiveTeacherId);

  const whereClause = isAdmin ? { id } : { id, teacherId: { in: allowedTeacherIds } };

  try {
    await prisma.grade.delete({
      where: whereClause
    });
    revalidatePath("/prof/notes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Erreur lors de la suppression." };
  }
}

export async function getTeacherGrades(teacherId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  const isAuthorized = session.user.id === teacherId || session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAuthorized) throw new Error("Non autorisé");

  return await prisma.grade.findMany({
    where: { teacherId },
    include: {
      student: {
        select: { firstName: true, lastName: true, class: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}
