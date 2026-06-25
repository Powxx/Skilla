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

  const [student, subjectsFromDb, semesters] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        grades: {
          orderBy: { createdAt: "desc" },
          include: {
            subject: true,
            semester: true
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
    prisma.semester.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    }),
  ]);
  
  if (!student) {
    redirect("/parent");
  }
  
  return (
    <GradesBody
      student={student as any}
      subjectsFromDb={subjectsFromDb}
      semesters={semesters as any}
      reportCardsVisible={student.class?.reportCardsVisible ?? true}
      contextNote="Vue famille : données en lecture seule pour l’élève sélectionné."
    />
  );
}
