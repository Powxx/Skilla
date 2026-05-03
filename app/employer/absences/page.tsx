import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import AbsencesBody from "@/components/student/absences-body";
import { authOptions } from "@/lib/auth-options";
import { resolveParentStudentId } from "@/lib/parent-access";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Absences — Famille",
};

export default async function ParentAbsencesPage({
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

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      class: true,
      attendances: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!student) {
    redirect("/parent");
  }

  return (
    <AbsencesBody
      student={student}
      contextNote="Vue famille : données en lecture seule pour l’élève sélectionné."
    />
  );
}
