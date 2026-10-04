import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import StudentDevoirsClient, { HomeworkItem } from "./devoirs-client";

export const metadata = {
  title: "Cahier de textes & Devoirs",
  description: "Consultez vos devoirs et travail à faire pour chaque matière",
};

export default async function StudentDevoirsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Retrieve current student profile with class
  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
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
            Votre compte élève n&apos;est actuellement assigné à aucune classe. Contactez l&apos;administration de votre établissement.
          </p>
        </div>
      </div>
    );
  }

  // Load subjects of the school
  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Load all lessons for the student's class that have homework defined
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

  // Filter out any entries where homework is empty whitespace
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

  // Load student's persisted completions
  const completions = await prisma.homeworkCompletion.findMany({
    where: { studentId: session.user.id },
    select: { lessonId: true },
  });
  const initialDoneLessonIds = completions.map((c) => c.lessonId);

  return (
    <StudentDevoirsClient
      studentName={`${student.firstName} ${student.lastName}`}
      className={student.class?.name || "Classe"}
      homeworks={validHomeworks}
      subjects={subjects}
      initialDoneLessonIds={initialDoneLessonIds}
    />
  );
}
