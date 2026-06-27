import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import TeacherPlanningClient from "./teacher-planning-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Mon Emploi du temps — Professeur",
};

export default async function ProfPlanningPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Fetch other teachers for replacement options
  const otherTeachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      isActive: true,
      id: { not: session.user.id }
    },
    select: { id: true, firstName: true, lastName: true }
  });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Mon Emploi du temps
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Consultez votre emploi du temps et demandez des remplacements si nécessaire.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
          <TeacherPlanningClient 
            teacherId={session.user.id} 
            teachers={otherTeachers} 
          />
        </div>
      </div>
    </div>
  );
}
