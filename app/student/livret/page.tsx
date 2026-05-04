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

  const evaluations = await prisma.evaluation.findMany({
    where: { studentId: session.user.id },
    orderBy: { competency: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto py-8">
      <LivretBody 
        studentName={session.user.name || "Moi"}
        competencies={evaluations.map(e => ({ id: e.id, name: e.competency, level: e.level, lastUpdated: e.id }))}
        isEditable={false}
      />
    </div>
  );
}
