import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import StudentDashboardClient from "@/app/student/dashboard/dashboard-client";
import { authOptions } from "@/lib/auth-options";
import { loadStudentDashboardPayload } from "@/lib/student-dashboard-data";
import { resolveParentStudentId, listParentChildrenSerialized } from "@/lib/parent-access";
import StudentSelector from "@/components/student/student-selector";

export const metadata = {
  title: "Tableau de bord — Famille",
};

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { studentId: studentIdParam } = await searchParams;

  const [studentId, allStudents] = await Promise.all([
    resolveParentStudentId(session.user.id, studentIdParam),
    listParentChildrenSerialized(session.user.id),
  ]);

  if (!studentId) {
    redirect("/parent");
  }

  const data = await loadStudentDashboardPayload({ id: studentId });
  if (!data) {
    redirect("/parent");
  }

  return (
    <StudentDashboardClient
      {...data}
      absencesDetailHref={`/parent/absences?studentId=${studentId}`}
    />
  );
}
