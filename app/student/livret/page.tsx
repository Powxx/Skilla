import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import LivretBody from "@/components/livret/livret-body";

export const dynamic = 'force-dynamic';

export default async function StudentLivretPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ 
    where: { id: session.user.id },
    include: { class: { include: { competencies: true } } } 
  });

  if (!user) redirect("/login");

  const evaluations = await prisma.evaluation.findMany({
    where: { studentId: session.user.id }
  });

  const classComps = user.class?.competencies || [];
  
  const schoolEvaluations = classComps
    .filter(cc => cc.category === 'SCHOOL')
    .map(cc => {
      const existing = evaluations.find(e => e.competency === cc.name && e.category === 'SCHOOL');
      return { id: cc.id, name: cc.name, level: existing?.level || 1, lastUpdated: existing?.id || 'new' };
    });

  const enterpriseEvaluations = classComps
    .filter(cc => cc.category === 'ENTERPRISE')
    .map(cc => {
      const existing = evaluations.find(e => e.competency === cc.name && e.category === 'ENTERPRISE');
      return { id: cc.id, name: cc.name, level: existing?.level || 1, lastUpdated: existing?.id || 'new' };
    });

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12">
      <section>
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl">
           <h3 className="text-blue-900 font-bold">Partie École</h3>
           <p className="text-sm text-blue-700">Compétences académiques validées par vos professeurs.</p>
        </div>
        <LivretBody 
          studentName={session.user.name || "Moi"}
          competencies={schoolEvaluations}
          isEditable={false}
        />
      </section>

      <section>
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-600 rounded-r-xl">
           <h3 className="text-amber-900 font-bold">Partie Entreprise</h3>
           <p className="text-sm text-amber-700">Compétences professionnelles validées par votre tuteur.</p>
        </div>
        <LivretBody 
          studentName={session.user.name || "Moi"}
          competencies={enterpriseEvaluations}
          isEditable={false}
        />
      </section>
    </div>
  );
}
