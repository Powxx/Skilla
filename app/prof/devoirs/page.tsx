import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import ProfDevoirsClient, { TeacherLessonHomework } from "./prof-devoirs-client";

import { getEffectiveTeacherId } from "@/lib/teacher-utils";

export const metadata = {
  title: "Gestion des devoirs — Espace Enseignant",
  description: "Attribuez et suivez les devoirs et travaux à faire pour vos classes",
};

export const dynamic = "force-dynamic";

export default async function ProfDevoirsPage() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN")
  ) {
    redirect("/login");
  }

  const teacherId = await getEffectiveTeacherId(session.user.id);
  const now = new Date();

  // Load teacher's lessons
  const [lessonsWithHw, upcomingLessons] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        OR: [{ teacherId }, { substituteId: teacherId }],
        homework: { not: null },
        isCancelled: false,
      },
      orderBy: { startTime: "desc" },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        subject: { select: { id: true, name: true } },
        homeworkCompletions: { select: { studentId: true } },
      },
      take: 100,
    }),
    prisma.lesson.findMany({
      where: {
        OR: [{ teacherId }, { substituteId: teacherId }],
        startTime: { gte: now },
        homework: null,
        isCancelled: false,
      },
      orderBy: { startTime: "asc" },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        subject: { select: { id: true, name: true } },
      },
      take: 30,
    }),
  ]);

  // Extract distinct classes
  const classMap = new Map<string, string>();
  [...lessonsWithHw, ...upcomingLessons].forEach((l) => {
    if (l.class) {
      classMap.set(l.class.id, l.class.name);
    }
  });

  const classes = Array.from(classMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // Nombre d'élèves dispensés par couple (classe, matière) : ils ne sont pas concernés par les devoirs
  const allLessons = [...lessonsWithHw, ...upcomingLessons];
  const subjectIds = [...new Set(allLessons.map((l) => l.subjectId).filter((id): id is string => !!id))];
  const dispensations = subjectIds.length
    ? await prisma.dispensation.findMany({
        where: { subjectId: { in: subjectIds }, student: { classId: { in: Array.from(classMap.keys()) } } },
        select: { studentId: true, subjectId: true, student: { select: { classId: true } } },
      })
    : [];
  const dispensedByKey = new Map<string, Set<string>>();
  for (const d of dispensations) {
    const key = `${d.student.classId}:${d.subjectId}`;
    if (!dispensedByKey.has(key)) dispensedByKey.set(key, new Set());
    dispensedByKey.get(key)!.add(d.studentId);
  }

  const formatLesson = (l: any): TeacherLessonHomework => {
    const dispensed = dispensedByKey.get(`${l.classId}:${l.subjectId}`) ?? new Set<string>();
    return {
    id: l.id,
    startTime: l.startTime.toISOString(),
    endTime: l.endTime.toISOString(),
    classId: l.classId,
    className: l.class?.name || "Classe",
    subjectId: l.subjectId || null,
    subjectName: l.isFreeLesson
      ? l.customSubject || "Cours libre"
      : l.subject?.name || "Sans matière",
    homework: l.homework?.trim() || null,
    summary: l.summary?.trim() || null,
    totalStudents: Math.max(0, (l.class?._count?.students || 0) - dispensed.size),
    completedCount: (l.homeworkCompletions || []).filter((hc: { studentId: string }) => !dispensed.has(hc.studentId)).length,
    };
  };

  const formattedWithHomework: TeacherLessonHomework[] = lessonsWithHw
    .filter((l) => l.homework && l.homework.trim().length > 0)
    .map(formatLesson);

  const formattedUpcomingWithoutHomework: TeacherLessonHomework[] =
    upcomingLessons.map(formatLesson);

  return (
    <ProfDevoirsClient
      teacherName={session.user.name || "Enseignant"}
      classes={classes}
      lessonsWithHomework={formattedWithHomework}
      upcomingLessonsWithoutHomework={formattedUpcomingWithoutHomework}
    />
  );
}
