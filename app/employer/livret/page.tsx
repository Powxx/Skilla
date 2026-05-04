import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { resolveTutorStudentId } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import LivretBody from "@/components/livret/livret-body";

export const dynamic = 'force-dynamic';

export default async function EmployerLivretPage({ searchParams }: { searchParams?: { studentId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COMPANY_TUTOR") {
    redirect("/login");
  }

  const studentId = await resolveTutorStudentId(session.user.id, searchParams?.studentId);
  if (!studentId) redirect("/employer");

  const [student, evaluations] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { firstName: true, lastName: true } }),
    prisma.evaluation.findMany({
      where: { studentId },
      orderBy: { competency: 'asc' }
    })
  ]);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <LivretBody 
        studentName={`${student?.firstName} ${student?.lastName}`}
        competencies={evaluations.map(e => ({ id: e.id, name: e.competency, level: e.level, lastUpdated: e.id }))}
        isEditable={false}
      />
    </div>
  );
}
