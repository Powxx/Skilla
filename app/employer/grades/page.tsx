import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import GradesBody from "@/components/student/grades-body";
import { authOptions } from "@/lib/auth-options";
import { resolveTutorStudentId } from "@/lib/employer-access";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Notes de l'alternant — Entreprise",
};

export default async function EmployerGradesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const studentId = await resolveTutorStudentId(
    session.user.id,
    searchParams?.studentId,
  );
  if (!studentId) {
    redirect("/employer");
  }

  const [student, subjectsFromDb] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        // 1. La relation est directe avec User
        // 2. On utilise 'Grade' (nom du modèle) car Prisma le met souvent au singulier
        // Si 'Grade' échoue, essaie 'grades' au pluriel ici.
        grades: { 
          orderBy: { createdAt: "desc" },
          include: { 
            subject: true,
            semester: true // On profite du fait qu'ils sont dans ton modèle
          },
        },
        reportCards: {
          orderBy: { semester: { startDate: 'desc' } },
          include: { semester: true }
        }
      },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  
  if (!student) {
    redirect("/employer");
  }
  
  return (
    <GradesBody
      student={student as any}
      subjectsFromDb={subjectsFromDb}
      contextNote="Vue entreprise : suivi pédagogique de l'alternant."
    />
  );
}