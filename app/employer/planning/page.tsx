import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { resolveParentStudentId } from "@/lib/parent-access";
import prisma from "@/lib/prisma";
import PlanningClient from "@/components/planning-client";

export const metadata = {
  title: "Planning de l'élève — Entreprise",
};

export default async function EmployerPlanningPage({
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

  const studentData = await prisma.user.findUnique({
    where: { id: studentId },
    select: { classId: true, firstName: true, lastName: true }
  });

  if (!studentData?.classId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">Aucune classe assignée.</p>
        <p className="mt-2 text-sm">
          Le planning de cet apprenti n'est pas disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-8">
        Planning de {studentData.firstName} {studentData.lastName}
      </h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
        <PlanningClient classId={studentData.classId} />
      </div>
    </div>
  );
}
