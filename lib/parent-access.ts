import prisma from "@/lib/prisma";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export async function listParentChildrenSerialized(parentUserId: string) {
  const rows = await prisma.user.findMany({
    where: { responsibles: { some: { id: parentUserId } } },
    orderBy: {
      lastName: "asc",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    label: `${r.lastName} ${r.firstName}`,
  }));
}

export async function resolveParentStudentId(
  parentUserId: string,
  studentIdParam: string | string[] | undefined,
): Promise<string | null> {
  const rows = await prisma.user.findMany({
    where: { responsibles: { some: { id: parentUserId } } },
    orderBy: {
      lastName: "asc",
    },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return null;
  const pref = firstParam(studentIdParam);
  if (pref && ids.includes(pref)) return pref;
  return ids[0] ?? null;
}

export async function parentOwnsStudent(
  parentUserId: string,
  studentId: string,
): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: {
      id: studentId,
      responsibles: { some: { id: parentUserId } },
    },
    select: { id: true },
  });
  return Boolean(row);
}
