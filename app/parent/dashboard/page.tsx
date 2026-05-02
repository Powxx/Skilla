import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import StudentDashboardClient from "@/app/student/dashboard/dashboard-client";
import { authOptions } from "@/lib/auth-options";
import { resolveParentStudentId } from "@/lib/parent-access";
import { loadStudentDashboardPayload } from "@/lib/student-dashboard-data";

export const metadata = {
  title: "Tableau de bord — Famille",
};

export default async function ParentDashboardPage({
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
