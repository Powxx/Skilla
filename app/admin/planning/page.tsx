import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import AdvancedPlanningClient from "./advanced-planning-client";
import Link from "next/link";

export const metadata = {
  title: "Gestion de l'Emploi du temps — Admin",
};

export default async function AdminPlanningPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  // Load data for the dropdowns
  const classes = await prisma.class.findMany({ select: { id: true, name: true }});
  
  // Get teachers with their allowed subjects
  const teachers = await prisma.user.findMany({ 
    where: { role: "TEACHER" },
    select: { 
      id: true, 
      firstName: true, 
      lastName: true,
      subjects: { select: { id: true, name: true } }
    }
  });
  
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true }});
  const rooms = await prisma.room.findMany({ select: { id: true, name: true }});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Emploi du temps & Cours</span>
        </nav>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Constructeur d'Emploi du temps
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Configurez les cours à gauche et glissez-les dans le calendrier au centre.
            </p>
          </div>
        </header>

        <AdvancedPlanningClient 
          classes={classes} 
          teachers={teachers} 
          subjects={subjects}
          rooms={rooms}
        />
      </div>
    </div>
  );
}
