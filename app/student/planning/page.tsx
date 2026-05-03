import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import PlanningClient from "@/components/planning-client";

export const metadata = {
  title: "Mon Planning — Élève",
};

export default async function StudentPlanningPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const studentData = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { classId: true }
  });

  if (!studentData?.classId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">Aucune classe assignée.</p>
        <p className="mt-2 text-sm">
          Votre emploi du temps n'est pas disponible car vous n'êtes assigné à aucune classe.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-8">
        Mon Planning
      </h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
        <PlanningClient classId={studentData.classId} />
      </div>
    </div>
  );
}
