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
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const studentId = await resolveParentStudentId(
    session.user.id,
    searchParams?.studentId,
  );
  if (!studentId) {
    redirect("/parent");
  }

  const [student, subjectsFromDb] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        class: true,
        grades: {
          orderBy: [{ date: "desc" }],
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

  return (
    <GradesBody
      student={student}
      subjectsFromDb={subjectsFromDb}
      contextNote="Vue famille : données en lecture seule pour l’élève sélectionné."
    />
  );
}
