import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { resolveParentStudentId } from "@/lib/parent-access";
import prisma from "@/lib/prisma";
import ParentDevoirsClient from "@/components/devoirs/parent-devoirs-client";
import { HomeworkItem } from "@/app/student/devoirs/devoirs-client";

export const metadata = {
  title: "Cahier de textes & Devoirs — Famille",
  description: "Suivi des devoirs et du travail scolaire de votre enfant",
};

export default async function ParentDevoirsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "RESPONSIBLE" && session.user.role !== "COMPANY_TUTOR")
  ) {
    redirect("/login");
  }

  const { studentId: studentIdParam } = await searchParams;

  const studentId = await resolveParentStudentId(
    session.user.id,
    studentIdParam
  );

  if (!studentId) {
    redirect("/parent");
  }

  // Load student profile with class
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      classId: true,
      class: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!student || !student.classId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="font-bold text-slate-900 text-lg">Aucune classe rattachée</p>
          <p className="mt-2 text-sm text-slate-500">
            L&apos;élève sélectionné n&apos;est rattaché à aucune classe active.
          </p>
        </div>
      </div>
    );
  }

  // Load school subjects
  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Load lessons with homework
  const lessons = await prisma.lesson.findMany({
    where: {
      classId: student.classId,
      homework: { not: null },
      isCancelled: false,
    },
    orderBy: {
      startTime: "desc",
    },
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      substitute: { select: { id: true, firstName: true, lastName: true } },
    },
    take: 100,
  });

  const validHomeworks: HomeworkItem[] = lessons
    .filter((l) => l.homework && l.homework.trim().length > 0)
    .map((l) => {
      const subjectName = l.isFreeLesson
        ? l.customSubject || "Cours libre"
        : l.subject?.name || "Sans matière";

      const teacherObj = l.substitute || l.teacher;
      const teacherName = l.isFreeLesson
        ? l.customTeacher || "Intervenant"
        : teacherObj
        ? `${teacherObj.firstName} ${teacherObj.lastName}`
        : "";

      return {
        id: l.id,
        subjectName,
        subjectId: l.subjectId || null,
        teacherName,
        date: l.startTime.toISOString(),
        content: l.homework!.trim(),
        summary: l.summary?.trim() || null,
      };
    });

  return (
    <ParentDevoirsClient
      studentName={`${student.firstName} ${student.lastName}`}
      className={student.class?.name || "Classe"}
      homeworks={validHomeworks}
      subjects={subjects}
      variant="parent"
    />
  );
}
