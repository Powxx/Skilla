import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { resolveParentStudentId } from "@/lib/parent-access";
import prisma from "@/lib/prisma";
import LivretBody from "@/components/livret/livret-body";

export const dynamic = 'force-dynamic';

export default async function ParentLivretPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { studentId: studentIdParam } = await searchParams;

  const studentId = await resolveParentStudentId(
    session.user.id,
    studentIdParam,
  );
  if (!studentId) {
    redirect("/parent");
  }

  const student = await prisma.user.findUnique({ 
    where: { id: studentId },
    include: { class: { include: { competencies: true } } } 
  });

  if (!student) redirect("/parent");

  const evaluations = await prisma.evaluation.findMany({
    where: { studentId: student.id }
  });

  const classComps = student.class?.competencies || [];
  
  const schoolEvaluations = classComps
    .filter(cc => cc.category === 'SCHOOL')
    .map(cc => {
      const existing = evaluations.find(e => e.competency === cc.name && e.category === 'SCHOOL');
      return { id: cc.id, name: cc.name, level: existing?.level || 1, category: 'SCHOOL', lastUpdated: existing?.id || 'new' };
    });

  const enterpriseEvaluations = classComps
    .filter(cc => cc.category === 'ENTERPRISE')
    .map(cc => {
      const existing = evaluations.find(e => e.competency === cc.name && e.category === 'ENTERPRISE');
      return { id: cc.id, name: cc.name, level: existing?.level || 1, category: 'ENTERPRISE', lastUpdated: existing?.id || 'new' };
    });

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Livret d'Apprentissage</h1>
        <p className="text-sm text-slate-500 font-medium">Suivi des compétences pour {student.firstName} {student.lastName}.</p>
      </header>

      <section>
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl">
           <h3 className="text-blue-900 font-bold">Partie École</h3>
           <p className="text-sm text-blue-700">Compétences académiques validées par les professeurs.</p>
        </div>
        <LivretBody 
          studentName={`${student.firstName} ${student.lastName}`}
          competencies={schoolEvaluations}
          isEditable={false}
        />
      </section>

      <section>
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-600 rounded-r-xl">
           <h3 className="text-amber-900 font-bold">Partie Entreprise</h3>
           <p className="text-sm text-amber-700">Compétences professionnelles validées par le tuteur.</p>
        </div>
        <LivretBody 
          studentName={`${student.firstName} ${student.lastName}`}
          competencies={enterpriseEvaluations}
          isEditable={false}
        />
      </section>
    </div>
  );
}
