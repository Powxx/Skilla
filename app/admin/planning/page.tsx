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

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN" && String(session.user.canManagePlanning) !== "TRUE")) {
    redirect("/login");
  }

  // Load data for the dropdowns
  const classes = await prisma.class.findMany({ select: { id: true, name: true } });

  // Get teachers with their allowed subjects
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER", isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      subjects: { select: { id: true, name: true } }
    }
  });

  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const rooms = await prisma.room.findMany({ select: { id: true, name: true } });

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
          <div className="flex gap-3">
            <Link
              href="/admin/planning/optimizer"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.455l.258-1.036.259 1.036a3.375 3.375 0 002.455 2.456l1.035.258-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Optimiseur IA
            </Link>
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
