import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import GradesBody from "@/components/student/grades-body";
import { authOptions } from "@/lib/auth-options";
import { resolveParentStudentId } from "@/lib/parent-access";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Notes — Famille",
};

export default async function ParentGradesPage({
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
      },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  
  if (!student) {
    redirect("/parent");
  }
  
  // 3. On formate l'objet pour le composant
  const formattedStudent = {
    ...student,
    // On renomme Grade en grades si ton composant AbsencesBody/GradesBody attend le pluriel
    grades: (student as any).Grade || [],
  };
  
  return (
    <GradesBody
      student={formattedStudent as any}
      subjectsFromDb={subjectsFromDb}
      contextNote="Vue famille : données en lecture seule pour l’élève sélectionné."
    />
  );
}