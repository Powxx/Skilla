import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { loadEmployerDashboardPayload } from "@/lib/employer-dashboard-data";
import EmployerDashboardClient from "./employer-client";

export const metadata = {
  title: "Espace Tuteur — Entreprise",
};

import { resolveTutorStudentId, listTutorStudentsSerialized } from "@/lib/employer-access";
import StudentSelector from "@/components/student/student-selector";

export default async function EmployerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COMPANY_TUTOR") {
    redirect("/login");
  }

  const { studentId: studentIdParam } = await searchParams;

  const [studentId, allStudents] = await Promise.all([
    resolveTutorStudentId(session.user.id, studentIdParam),
    listTutorStudentsSerialized(session.user.id),
  ]);

  if (!studentId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">
          Aucun alternant rattaché à votre compte tuteur.
        </p>
        <p className="mt-2 text-sm">
          Contactez la ECM Academie pour lier vos apprentis à votre compte.
        </p>
      </div>
    );
  }

  const studentsData = await loadEmployerDashboardPayload(session.user.id);
  const selectedStudentData = studentsData?.find(s => s.studentId === studentId);

  if (!selectedStudentData) {
    redirect("/employer/dashboard");
  }

  return (
    <EmployerDashboardClient students={[selectedStudentData]} />
  );
}
