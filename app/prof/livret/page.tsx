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
    select: { id: true, firstName: true, lastName: true, classId: true, class: { select: { name: true } } },
    orderBy: { lastName: 'asc' }
  });

  const studentId = searchParams?.studentId || students[0]?.id;
  
  // 2. Get the student's class competencies (SCHOOL only)
  const student = students.find(s => s.id === studentId);
  const classId = (student as any)?.classId;

  const [classComps, evaluations] = await Promise.all([
    classId ? prisma.classCompetency.findMany({ where: { classId, category: 'SCHOOL' } }) : [],
    studentId ? prisma.evaluation.findMany({ where: { studentId, category: 'SCHOOL' } }) : []
  ]);

  // Combine: if evaluation exists, use its level. Otherwise use class competency name with level 1.
  const mergedEvaluations = classComps.map(cc => {
    const existing = evaluations.find(e => e.competency === cc.name);
    return {
      id: cc.id,
      name: cc.name,
      level: existing?.level || 1,
      lastUpdated: existing?.id || 'new'
    };
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Livret d'Apprentissage — École</h1>
        <p className="text-sm text-slate-500 font-medium">Évaluation des compétences académiques pour {student?.firstName} {student?.lastName}.</p>
      </header>

      <ProfLivretClient 
        students={students.map(s => ({ id: s.id, name: `${s.lastName} ${s.firstName}`, className: s.class?.name }))}
        initialEvaluations={mergedEvaluations}
        selectedStudentId={studentId}
        category="SCHOOL"
      />
    </div>
  );
}
