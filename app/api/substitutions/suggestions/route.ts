import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-errors";
import { getEffectiveTeacherId } from "@/lib/teacher-utils";
import { evaluateSubstitute } from "@/lib/substitute-suggestions";

/**
 * Collègues susceptibles de remplacer l'enseignant sur un cours :
 * ceux qui sont libres sur le créneau d'abord, puis ceux qui enseignent la matière.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const lessonId = new URL(request.url).searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ error: "ID du cours manquant." }, { status: 400 });
  }

  try {
    const effectiveTeacherId = await getEffectiveTeacherId(session.user.id);
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { startTime: true, endTime: true, teacherId: true, substituteId: true, subjectId: true },
    });
    if (!lesson) return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin && lesson.teacherId !== effectiveTeacherId) {
      return NextResponse.json({ error: "Ce cours n'est pas le vôtre." }, { status: 403 });
    }

    const teachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        isActive: true,
        id: { not: lesson.teacherId ?? effectiveTeacherId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        subjects: { select: { id: true } },
        availabilities: { select: { dayOfWeek: true, startTime: true, endTime: true } },
      },
    });

    const busy = await prisma.lesson.findMany({
      where: {
        isCancelled: false,
        startTime: { lt: lesson.endTime },
        endTime: { gt: lesson.startTime },
        OR: [
          { teacherId: { in: teachers.map((t) => t.id) }, substituteId: null },
          { substituteId: { in: teachers.map((t) => t.id) } },
        ],
      },
      select: { teacherId: true, substituteId: true, startTime: true, endTime: true },
    });

    const suggestions = teachers.map((t) => {
      const status = evaluateSubstitute({
        lessonStart: lesson.startTime,
        lessonEnd: lesson.endTime,
        availabilities: t.availabilities,
        busyLessons: busy.filter((l) => (l.substituteId ?? l.teacherId) === t.id),
      });
      return {
        id: t.id,
        name: `${(t.lastName || "").toUpperCase()} ${t.firstName || ""}`.trim(),
        status,
        teachesSubject: Boolean(lesson.subjectId && t.subjects.some((s) => s.id === lesson.subjectId)),
      };
    });

    const rank = { FREE: 0, UNAVAILABLE: 1, BUSY: 2 } as const;
    suggestions.sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        Number(b.teachesSubject) - Number(a.teachesSubject) ||
        a.name.localeCompare(b.name, "fr"),
    );

    return NextResponse.json(suggestions);
  } catch (error) {
    return apiErrorResponse(error, 500);
  }
}
