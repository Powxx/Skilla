import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function HRDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Stats for the current month
  const teachersCount = await prisma.user.count({ where: { role: "TEACHER" } });
  
  const lessonsThisMonth = await prisma.lesson.findMany({
    where: {
      startTime: { gte: monthStart },
      endTime: { lte: monthEnd },
      isCancelled: false,
    },
    select: {
      startTime: true,
      endTime: true,
      teacherId: true,
    }
  });

  const totalHours = lessonsThisMonth.reduce((acc, lesson) => {
    const duration = (lesson.endTime.getTime() - lesson.startTime.getTime()) / (1000 * 60 * 60);
    return acc + duration;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">RH</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Pôle Ressources Humaines
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Gestion des contrats, suivi des heures et pilotage de la masse salariale.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Professeurs</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{teachersCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Heures réalisées ce mois</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {lessonsThisMonth.filter(l => new Date(l.endTime) < now).reduce((acc, l) => acc + (l.endTime.getTime() - l.startTime.getTime()) / (1000 * 60 * 60), 0).toFixed(1)}h
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Total projeté</div>
            <div className="mt-2 text-3xl font-semibold text-blue-600">{totalHours.toFixed(1)}h</div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/admin/hr/teachers" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-blue-300 hover:ring-blue-500/10">
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600">Suivi des Professeurs →</h2>
            <p className="mt-2 text-sm text-slate-600">
              Consultez les contrats, les heures réalisées et gérez les taux horaires individuels.
            </p>
          </Link>
          
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 flex items-center justify-center text-center">
            <p className="text-sm text-slate-400 italic">
              D'autres modules RH (congés, formations Qualiopi) seront bientôt disponibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
