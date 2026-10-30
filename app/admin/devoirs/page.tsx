import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import AdminDevoirsClient, { AdminCourseLesson } from "./admin-devoirs-client";

export const metadata = {
  title: "Cahier de Texte & Supervision des Devoirs — Espace Administration",
  description: "Vue d'ensemble des contenus pédagogiques, résumés de cours et devoirs assignés aux classes",
};

export const dynamic = "force-dynamic";

export default async function AdminDevoirsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; classId?: string; subjectId?: string; teacherId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};

  const now = new Date();
  const activeSemester = await prisma.semester.findFirst({
    where: {
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { startDate: "desc" },
  });

  const periodStart = activeSemester?.startDate || new Date(now.getFullYear(), 8, 1);
  // Jusqu'à 45 jours après aujourd'hui pour voir les devoirs à venir, sans charger les années suivantes
  const periodEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  // Charger les séances de la période scolaire active, en incluant les cours avec contenu ou devoirs
  const [lessons, classes, teachers] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        isCancelled: false,
        OR: [
          { startTime: { gte: periodStart, lte: periodEnd } },
          { summary: { not: null } },
          { homework: { not: null } },
        ],
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
        room: { select: { id: true, name: true } },
        homeworkCompletions: { select: { studentId: true } },
      },
      take: 450,
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

  const formattedLessons: AdminCourseLesson[] = lessons.map((l) => {
    const teacherObj = l.substitute || l.teacher;
    const teacherName = l.isFreeLesson
      ? l.customTeacher || "Intervenant externe"
      : teacherObj
      ? `${(teacherObj.lastName || "").toUpperCase()} ${teacherObj.firstName || ""}`
      : "Non assigné";

    const subjectName = l.isFreeLesson
      ? l.customSubject || "Cours libre"
      : l.subject?.name || "Sans matière";

    const homework = l.homework?.trim() || null;
    const summary = l.summary?.trim() || null;

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
      roomId: l.roomId || null,
      roomName: l.room?.name || null,
      homework,
      summary,
      hasHomework: Boolean(homework && homework.length > 0),
      hasSummary: Boolean(summary && summary.length > 0),
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
        name: `${(t.lastName || "").toUpperCase()} ${t.firstName || ""}`,
      }))}
      initialTab={(resolvedParams.tab as any) || "HOMEWORK"}
      initialClassId={resolvedParams.classId || "ALL"}
      initialSubjectId={resolvedParams.subjectId || "ALL"}
      initialTeacherId={resolvedParams.teacherId || "ALL"}
    />
  );
}
