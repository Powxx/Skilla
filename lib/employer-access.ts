import prisma from "@/lib/prisma";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Liste les alternants suivis par un tuteur entreprise.
 */
export async function listTutorStudentsSerialized(tutorId: string) {
  const contracts = await prisma.companyContract.findMany({
    where: { tutorId },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    },
    orderBy: {
      student: { lastName: "asc" }
    }
  });

  return contracts.map((c) => ({
    id: c.student.id,
    label: `${c.student.lastName} ${c.student.firstName}`,
  }));
}

/**
 * Résout l'ID de l'élève à afficher pour un tuteur.
 */
export async function resolveTutorStudentId(
  tutorId: string,
  studentIdParam: string | string[] | undefined,
): Promise<string | null> {
  const contracts = await prisma.companyContract.findMany({
    where: { tutorId },
    select: { studentId: true },
  });
  
  const ids = contracts.map((c) => c.studentId);
  if (ids.length === 0) return null;
  
  const pref = firstParam(studentIdParam);
  if (pref && ids.includes(pref)) return pref;
  return ids[0] ?? null;
}

/**
 * Vérifie si un tuteur suit un élève spécifique.
 */
export async function tutorOwnsStudent(
  tutorId: string,
  studentId: string,
): Promise<boolean> {
  const contract = await prisma.companyContract.findFirst({
    where: {
      studentId: studentId,
      tutorId: tutorId,
    },
    select: { id: true },
  });
  return Boolean(contract);
}
