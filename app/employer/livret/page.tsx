import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { resolveTutorStudentId } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import ProfLivretClient from "@/app/prof/livret/prof-livret-client";

export const dynamic = 'force-dynamic';

export default async function EmployerLivretPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ studentId?: string, semesterId?: string }> 
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COMPANY_TUTOR") {
    redirect("/login");
  }

  const { studentId: studentIdParam, semesterId: semesterIdParam } = await searchParams;

  const studentId = await resolveTutorStudentId(session.user.id, studentIdParam);
  if (!studentId) redirect("/employer");

  const [contracts, student, allTutorStudents, semesters] = await Promise.all([
    prisma.companyContract.findMany({ where: { tutorId: session.user.id } }),
    prisma.user.findUnique({ where: { id: studentId }, include: { class: true } }),
    prisma.companyContract.findMany({
       where: { tutorId: session.user.id },
       include: { student: { include: { class: true } } }
    }),
    prisma.semester.findMany({ orderBy: { startDate: 'desc' } })
  ]);

  const semesterId = semesterIdParam || (semesters.length > 0 ? semesters[0].id : undefined);

  if (!semesterId) {
     return (
        <div className="p-12 text-center text-slate-500 italic">
          Aucun semestre disponible.
        </div>
     );
  }

  // Check if student is in alternance
  const currentContract = contracts.find(c => c.studentId === studentId);
  if (currentContract?.type !== "APPRENTICESHIP") {
    return (
      <div className="p-12 text-center text-slate-500 italic">
        Le livret d'apprentissage est réservé aux alternants.
      </div>
    );
  }

  const classId = student?.classId;
  const [classComps, evaluations] = await Promise.all([
    classId ? prisma.classCompetency.findMany({ where: { classId, category: 'ENTERPRISE' } }) : [],
    studentId ? prisma.evaluation.findMany({ where: { studentId, category: 'ENTERPRISE', semesterId } }) : []
  ]);

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
        <h1 className="text-3xl font-black text-slate-900">Livret d'Apprentissage — Entreprise</h1>
        <p className="text-sm text-slate-500 font-medium">Évaluation des compétences professionnelles pour {student?.firstName} {student?.lastName}.</p>
      </header>

      <ProfLivretClient 
        students={allTutorStudents.map(c => ({ id: c.student.id, name: `${c.student.lastName} ${c.student.firstName}`, className: c.student.class?.name }))}
        initialEvaluations={mergedEvaluations}
        selectedStudentId={studentId}
        selectedSemesterId={semesterId}
        semesters={semesters}
        category="ENTERPRISE"
      />
    </div>
  );
}
