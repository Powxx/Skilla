import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import RequirementsClient from "./requirements-client";
import Link from "next/link";

export default async function ClassRequirementsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [classes, subjects, requirements] = await Promise.all([
    prisma.class.findMany({ orderBy: { name: 'asc' } }),
    prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    prisma.classSubjectRequirement.findMany({
      include: { class: true, subject: true },
      orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }]
    })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Quotas horaires</span>
        </nav>

        <header className="mb-12">
          <h1 className="text-3xl font-black tracking-tight uppercase">Quotas Horaires par Classe</h1>
          <p className="mt-2 text-slate-500 font-medium italic">Définissez le nombre d'heures hebdomadaires par matière pour l'optimisation IA.</p>
        </header>

        <RequirementsClient 
          initialClasses={classes} 
          initialSubjects={subjects} 
          initialRequirements={requirements} 
        />
      </div>
    </div>
  );
}
