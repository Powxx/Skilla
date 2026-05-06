import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import AbsencesBody from "@/components/student/absences-body";
import { authOptions } from "@/lib/auth-options";
import { resolveTutorStudentId } from "@/lib/employer-access";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Assiduité Alternant — Entreprise",
};

export default async function EmployerAbsencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { studentId: studentIdParam } = await searchParams;

  const studentId = await resolveTutorStudentId(
    session.user.id,
    studentIdParam,
  );
  if (!studentId) {
    redirect("/employer");
  }

  const [student, attendances] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      include: { class: true }
    }),
    prisma.attendance.findMany({
      where: { studentId: studentId }, 
      include: {
        lesson: {
          include: { subject: true }
        }
      }
    })
  ]);
  
  if (!student) redirect("/employer");
  
  // 3. On trie manuellement en JS puisque Prisma ne peut pas trier 
  // sur un champ d'une relation imbriquée (lesson.date) dans un findMany de base
  const sortedAttendances = attendances.sort((a, b) => {
    return new Date(b.lesson.startTime).getTime() - new Date(a.lesson.startTime).getTime();
  });
  
  const studentWithAbsences = {
    ...student,
    attendances: sortedAttendances
  };
  
  return (
    <AbsencesBody
      // On utilise "any" temporairement si l'interface est trop complexe à aligner,
      // ou on passe l'objet formaté
      student={studentWithAbsences as any} 
      contextNote="Vue entreprise : suivi de l'assiduité de l'alternant."
    />
  );
}