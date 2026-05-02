import prisma from "@/lib/prisma";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export async function listParentChildrenSerialized(parentUserId: string) {
  const rows = await prisma.parentStudent.findMany({
    where: { parentUserId },
    orderBy: {
      student: { user: { lastName: "asc" } },
    },
    select: {
      student: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.student.id,
    label: `${r.student.user.lastName} ${r.student.user.firstName}`,
  }));
}

/** Retourne l’id élève sélectionné (query) ou le premier lié au parent ; `null` si aucun enfant. */
export async function resolveParentStudentId(
  parentUserId: string,
  studentIdParam: string | string[] | undefined,
): Promise<string | null> {
  const rows = await prisma.parentStudent.findMany({
    where: { parentUserId },
    orderBy: {
      student: { user: { lastName: "asc" } },
    },
    select: { studentId: true },
  });
  const ids = rows.map((r) => r.studentId);
  if (ids.length === 0) return null;
  const pref = firstParam(studentIdParam);
  if (pref && ids.includes(pref)) return pref;
  return ids[0] ?? null;
}

export async function parentOwnsStudent(
  parentUserId: string,
  studentId: string,
): Promise<boolean> {
  const row = await prisma.parentStudent.findUnique({
    where: {
      parentUserId_studentId: { parentUserId, studentId },
    },
    select: { id: true },
  });
  return Boolean(row);
}
