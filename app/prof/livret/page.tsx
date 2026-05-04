import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ProfLivretClient from "./prof-livret-client";

export const dynamic = 'force-dynamic';

export default async function ProfLivretPage({ searchParams }: { searchParams?: { studentId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // 1. Get my students (those in my classes)
  const teacherLessons = await prisma.lesson.findMany({
    where: { teacherId: session.user.id },
    select: { classId: true }
  });
  const classIds = [...new Set(teacherLessons.map(l => l.classId))];

  const students = await prisma.user.findMany({
    where: { classId: { in: classIds }, role: "STUDENT" },
    select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } },
    orderBy: { lastName: 'asc' }
  });

  const studentId = searchParams?.studentId || students[0]?.id;
  
  // 2. Get evaluations for the selected student
  const evaluations = studentId ? await prisma.evaluation.findMany({
    where: { studentId },
    orderBy: { competency: 'asc' }
  }) : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Évaluation des Compétences</h1>
        <p className="text-sm text-slate-500 font-medium">Saisissez les niveaux d'acquisition pour chaque élève.</p>
      </header>

      <ProfLivretClient 
        students={students.map(s => ({ id: s.id, name: `${s.lastName} ${s.firstName}`, className: s.class?.name }))}
        initialEvaluations={evaluations.map(e => ({ id: e.id, name: e.competency, level: e.level, lastUpdated: e.id }))}
        selectedStudentId={studentId}
      />
    </div>
  );
}
