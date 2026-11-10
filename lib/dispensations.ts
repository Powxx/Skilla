import prisma from "@/lib/prisma";

/**
 * Renvoie l'ensemble des IDs d'élèves dispensés d'une matière.
 * Un élève dispensé ne doit apparaître nulle part pour cette matière :
 * ni appel, ni note, ni devoir, ni contenu de cours, ni notification.
 *
 * @param subjectId Matière concernée (null/undefined → aucune dispense possible, ex : cours libre)
 * @param studentIds Restreint la recherche à ces élèves (optionnel)
 */
export async function getDispensedStudentIds(
  subjectId: string | null | undefined,
  studentIds?: string[]
): Promise<Set<string>> {
  if (!subjectId) return new Set();
  if (studentIds && studentIds.length === 0) return new Set();

  const rows = await prisma.dispensation.findMany({
    where: {
      subjectId,
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
    },
    select: { studentId: true },
  });
  return new Set(rows.map((r) => r.studentId));
}

/** Indique si un élève est dispensé d'une matière. */
export async function isStudentDispensed(
  studentId: string,
  subjectId: string | null | undefined
): Promise<boolean> {
  if (!subjectId || !studentId) return false;
  const row = await prisma.dispensation.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** Message d'erreur commun lorsqu'une action vise un élève dispensé. */
export const DISPENSED_ERROR =
  "Cet élève est dispensé de cette matière : aucun appel, note ou devoir ne peut lui être attribué.";
