import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import AdminDevoirsClient, { AdminHomeworkLesson } from "./admin-devoirs-client";

export const metadata = {
  title: "Supervision des devoirs — Espace Administration",
  description: "Vue d'ensemble de tous les devoirs assignés aux classes par les enseignants",
};

export const dynamic = "force-dynamic";

export default async function AdminDevoirsPage() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    redirect("/login");
  }

  // Load all lessons that have homework defined across all classes
  const [lessonsWithHw, classes, teachers] = await Promise.all([
    prisma.lesson.findMany({
      where: {
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
        teacher: { select: { id: true, firstName: true, lastName: true } },
        substitute: { select: { id: true, firstName: true, lastName: true } },
        homeworkCompletions: { select: { studentId: true } },
      },
      take: 200,
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  const formattedLessons: AdminHomeworkLesson[] = lessonsWithHw
    .filter((l) => l.homework && l.homework.trim().length > 0)
    .map((l) => {
      const teacherObj = l.substitute || l.teacher;
      const teacherName = l.isFreeLesson
        ? l.customTeacher || "Intervenant externe"
        : teacherObj
        ? `${teacherObj.firstName} ${teacherObj.lastName}`
        : "Non assigné";

      const subjectName = l.isFreeLesson
        ? l.customSubject || "Cours libre"
        : l.subject?.name || "Sans matière";

      return {
        id: l.id,
        startTime: l.startTime.toISOString(),
        endTime: l.endTime.toISOString(),
        classId: l.classId,
        className: l.class?.name || "Classe",
        subjectId: l.subjectId || null,
        subjectName,
        teacherId: l.teacherId || l.substituteId || null,
        teacherName,
        homework: l.homework!.trim(),
        summary: l.summary?.trim() || null,
        totalStudents: l.class?._count?.students || 0,
        completedCount: l.homeworkCompletions?.length || 0,
      };
    });

  return (
    <AdminDevoirsClient
      lessons={formattedLessons}
      classes={classes}
      teachers={teachers.map((t) => ({
        id: t.id,
        name: `${t.lastName} ${t.firstName}`,
      }))}
    />
  );
}
