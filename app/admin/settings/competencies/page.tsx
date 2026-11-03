import { requirePagePermission } from "@/lib/authz";
import prisma from "@/lib/prisma";
import ClassCompetenciesClient from "./class-competencies-client";

export const dynamic = 'force-dynamic';

export default async function AdminCompetenciesPage() {
  await requirePagePermission("canManageSettings");

  const [classes, competencies] = await Promise.all([
    prisma.class.findMany({ orderBy: { name: 'asc' } }),
    prisma.classCompetency.findMany({ include: { class: true }, orderBy: { name: 'asc' } })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
