import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getCurrentSchoolYear(schoolYears: { name: string; startDate: Date; endDate: Date }[]) {
  const now = new Date();
  return schoolYears.find((sy) => now >= sy.startDate && now <= sy.endDate) || schoolYears[0] || null;
}

export default async function HRDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const schoolYears = await prisma.schoolYear.findMany({ orderBy: { startDate: "desc" } });
  const currentSchoolYear = getCurrentSchoolYear(schoolYears);

  const teachersCount = await prisma.user.count({ where: { role: "TEACHER" } });

  let lessonsFilter: any = { isCancelled: false };
  if (currentSchoolYear) {
    lessonsFilter.startTime = { gte: currentSchoolYear.startDate };
    lessonsFilter.endTime = { lte: currentSchoolYear.endDate };
  }

  const lessonsThisYear = await prisma.lesson.findMany({
    where: lessonsFilter,
    select: {
      startTime: true,
      endTime: true,
      teacherId: true,
    },
  });

  const now = new Date();

  // Algorithme de fusion des créneaux simultanés (aligné sur le planning)
  const teacherMap = new Map<string, { start: number; end: number }[]>();
  let unassignedMs = 0;

  const realizedLessons = lessonsThisYear.filter((l) => new Date(l.endTime) < now);

  for (const lesson of realizedLessons) {
    const startMs = lesson.startTime.getTime();
    const endMs = lesson.endTime.getTime();
    if (endMs <= startMs) continue;

    if (!lesson.teacherId) {
      unassignedMs += endMs - startMs;
      continue;
    }

    const intervals = teacherMap.get(lesson.teacherId) ?? [];
    intervals.push({ start: startMs, end: endMs });
    teacherMap.set(lesson.teacherId, intervals);
  }

  let totalTeacherMs = 0;
  for (const intervals of teacherMap.values()) {
    if (intervals.length === 0) continue;
    intervals.sort((a, b) => a.start - b.start);

    const merged: { start: number; end: number }[] = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i];
      const last = merged[merged.length - 1];

      if (current.start < last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    totalTeacherMs += merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
  }

  const realizedHours = (totalTeacherMs + unassignedMs) / (1000 * 60 * 60);

  const contracts = await prisma.teacherContract.findMany({ select: { annualHours: true } });
  const totalAnnualHours = contracts.reduce((acc, c) => acc + c.annualHours, 0);

  const rate = totalAnnualHours > 0 ? Math.min(100, Math.round((realizedHours / totalAnnualHours) * 100)) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">
            Accueil
          </Link>
          <span aria-hidden className="mx-2 text-slate-300">
            /
          </span>
          <Link href="/admin" className="font-medium hover:text-slate-700">
            Admin
          </Link>
          <span aria-hidden className="mx-2 text-slate-300">
            /
          </span>
          <span className="text-slate-900">RH</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Pôle Ressources Humaines
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Gestion des contrats, suivi annualisé des heures et pilotage de la masse salariale.
          </p>
          {currentSchoolYear && (
            <p className="mt-1 text-xs text-blue-600 font-medium">
              Année scolaire : {currentSchoolYear.name}
            </p>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Professeurs</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{teachersCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">
              Heures réalisées{currentSchoolYear ? " cette année" : ""}
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {realizedHours.toFixed(1)}h
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Total annualisé prévu</div>
            <div className="mt-2 text-3xl font-semibold text-blue-600">
              {totalAnnualHours > 0 ? totalAnnualHours.toFixed(0) : "—"}h
            </div>
            <div className="mt-1 text-xs text-slate-400">Somme des contrats</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Taux de réalisation</div>
            <div className="mt-2 text-3xl font-semibold text-emerald-600">
              {rate !== null ? `${rate}%` : "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/admin/hr/teachers"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-blue-300 hover:ring-blue-500/10"
          >
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600">
              Suivi des Professeurs
              {" →"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Consultez les contrats, les heures annualisées et gérez les taux horaires individuels.
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
