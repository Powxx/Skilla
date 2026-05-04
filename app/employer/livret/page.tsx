import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { resolveTutorStudentId } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import ProfLivretClient from "@/app/prof/livret/prof-livret-client";

export const dynamic = 'force-dynamic';

export default async function EmployerLivretPage({ searchParams }: { searchParams?: { studentId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COMPANY_TUTOR") {
    redirect("/login");
  }

  const studentId = await resolveTutorStudentId(session.user.id, searchParams?.studentId);
  if (!studentId) redirect("/employer");

  const [contracts, student, allTutorStudents] = await Promise.all([
    prisma.companyContract.findMany({ where: { tutorId: session.user.id } }),
    prisma.user.findUnique({ where: { id: studentId }, include: { class: true } }),
    prisma.companyContract.findMany({
       where: { tutorId: session.user.id },
       include: { student: { include: { class: true } } }
    })
  ]);

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
    prisma.evaluation.findMany({ where: { studentId, category: 'ENTERPRISE' } })
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
        category="ENTERPRISE"
      />
    </div>
  );
}
