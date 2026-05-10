import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminCompetenciesRecapClient from "./recap-client";

export const dynamic = 'force-dynamic';

export default async function AdminCompetenciesRecapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [classes, students, semesters] = await Promise.all([
    prisma.class.findMany({
      include: { competencies: true },
      orderBy: { name: 'asc' }
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      include: { evaluations: true },
      orderBy: { lastName: 'asc' }
    }),
    prisma.semester.findMany({
      orderBy: { startDate: 'asc' }
    })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Suivi des Compétences</h1>
          <p className="mt-2 text-slate-500 font-medium">Vue d'ensemble de la progression des élèves (École & Entreprise).</p>
        </header>

        <AdminCompetenciesRecapClient 
          initialClasses={classes} 
          studentsData={students} 
          semesters={semesters}
        />
      </div>
    </div>
  );
}
