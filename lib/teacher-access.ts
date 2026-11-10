import prisma from "@/lib/prisma";
import { getEffectiveTeacherId } from "@/lib/teacher-utils";

/**
 * Contrôles de périmètre pour les enseignants : un professeur n'accède qu'aux classes
 * (et donc aux élèves) avec lesquelles il a au moins un cours, en titulaire ou en remplaçant.
 * Les administrateurs ne sont pas restreints.
 */

type SessionUser = { id: string; role: string };

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Vérifie qu'un enseignant (ou admin) a accès à une classe. */
export async function canAccessClass(user: SessionUser, classId: string): Promise<boolean> {
  if (isAdminRole(user.role)) return true;
  if (user.role !== "TEACHER" || !classId) return false;

  const teacherId = await getEffectiveTeacherId(user.id);
  const lesson = await prisma.lesson.findFirst({
    where: {
      classId,
      OR: [{ teacherId }, { substituteId: teacherId }],
    },
    select: { id: true },
  });
  return Boolean(lesson);
}

/** Vérifie qu'un enseignant (ou admin) a accès à tous les élèves donnés (via leur classe). */
export async function canAccessStudents(user: SessionUser, studentIds: string[]): Promise<boolean> {
  if (isAdminRole(user.role)) return true;
  if (user.role !== "TEACHER") return false;

  const uniqueIds = Array.from(new Set(studentIds));
  if (uniqueIds.length === 0) return true;

  const students = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { classId: true },
  });
  if (students.length !== uniqueIds.length) return false;

  const classIds = Array.from(new Set(students.map((s) => s.classId)));
  if (classIds.some((c) => !c)) return false;

  for (const classId of classIds as string[]) {
    if (!(await canAccessClass(user, classId))) return false;
  }
  return true;
}

/** Vérifie qu'un enseignant (ou admin) est titulaire ou remplaçant d'un cours. */
export async function canAccessLesson(
  user: SessionUser,
  lesson: { teacherId: string | null; substituteId: string | null }
): Promise<boolean> {
  if (isAdminRole(user.role)) return true;
  if (user.role !== "TEACHER") return false;

  const teacherId = await getEffectiveTeacherId(user.id);
  return lesson.teacherId === teacherId || lesson.substituteId === teacherId;
}
