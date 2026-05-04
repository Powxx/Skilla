import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ClassCompetenciesClient from "./class-competencies-client";

export const dynamic = 'force-dynamic';

export default async function AdminCompetenciesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const [classes, competencies] = await Promise.all([
    prisma.class.findMany({ orderBy: { name: 'asc' } }),
    prisma.classCompetency.findMany({ include: { class: true }, orderBy: { name: 'asc' } })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <h1 className="text-3xl font-black tracking-tight">Configuration des Compétences</h1>
          <p className="mt-2 text-slate-500 font-medium">Définissez les axes d'évaluation par classe pour l'école et l'entreprise.</p>
        </header>

        <ClassCompetenciesClient 
          initialClasses={classes} 
          initialCompetencies={competencies} 
        />
      </div>
    </div>
  );
}
