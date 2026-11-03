import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { authOptions } from "@/lib/auth-options";
import { resolveTutorStudentId } from "@/lib/employer-access";
import { formatStudentName } from "@/lib/user-utils";
import {
  computeAlternanceWeeks,
  groupAlternancePeriods,
  type AlternanceWeek,
  type AlternanceWeekStatus,
} from "@/lib/alternance";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendrier d'alternance — Entreprise",
};

const STATUS_STYLE: Record<AlternanceWeekStatus, { label: string; cell: string; dot: string }> = {
  SCHOOL: {
    label: "À l'école",
    cell: "border-blue-200 bg-blue-50 text-blue-900",
    dot: "bg-blue-500",
  },
  COMPANY: {
    label: "En entreprise",
    cell: "border-emerald-200 bg-emerald-50 text-emerald-900",
    dot: "bg-emerald-500",
  },
  HOLIDAY: {
    label: "Vacances / fermeture",
    cell: "border-amber-200 bg-amber-50 text-amber-900",
    dot: "bg-amber-400",
  },
  UNKNOWN: {
    label: "Planning non publié",
    cell: "border-dashed border-slate-300 bg-white text-slate-500",
    dot: "bg-slate-300",
  },
};

function weekRange(weekStart: string) {
  const monday = parseISO(weekStart);
  return `${format(monday, "d MMM", { locale: fr })} – ${format(addDays(monday, 4), "d MMM", { locale: fr })}`;
}

export default async function EmployerAlternancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COMPANY_TUTOR") {
    redirect("/login");
  }

  const { studentId: studentIdParam } = await searchParams;
  const studentId = await resolveTutorStudentId(session.user.id, studentIdParam);
  if (!studentId) redirect("/employer");

  const [student, contracts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true, classId: true, class: { select: { name: true } } },
    }),
    prisma.companyContract.findMany({
      where: { tutorId: session.user.id, studentId },
      orderBy: { startDate: "asc" },
    }),
  ]);

  if (!student?.classId || contracts.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">Calendrier indisponible.</p>
        <p className="mt-2 text-sm">
          L&apos;apprenti doit être rattaché à une classe et à un contrat d&apos;alternance.
        </p>
      </div>
    );
  }

  const contractStart = contracts[0].startDate;
  const contractEnd = contracts.reduce(
    (max, c) => (c.endDate > max ? c.endDate : max),
    contracts[0].endDate,
  );

  const [lessons, holidays] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        classId: student.classId,
        isCancelled: false,
        startTime: { gte: startOfDay(contractStart), lte: addDays(startOfDay(contractEnd), 1) },
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: startOfDay(contractStart), lte: addDays(startOfDay(contractEnd), 1) } },
      select: { date: true },
    }),
  ]);

  const weeks = computeAlternanceWeeks({
    lessons,
    holidays: holidays.map((h) => h.date),
    contractStart,
    contractEnd,
  });
  const inContract = weeks.filter((w) => w.inContract);
  const periods = groupAlternancePeriods(inContract);

  const count = (s: AlternanceWeekStatus) => inContract.filter((w) => w.status === s).length;
  const thisMonday = format(startOfDay(new Date()), "yyyy-MM-dd");
  const currentWeek = inContract.find(
    (w) => w.weekStart <= thisMonday && format(addDays(parseISO(w.weekStart), 6), "yyyy-MM-dd") >= thisMonday,
  );
  const nextChange = inContract.find(
    (w) => w.weekStart > thisMonday && currentWeek && w.status !== currentWeek.status && w.status !== "HOLIDAY",
  );

  // Regroupement par mois (selon le jeudi de la semaine, convention ISO)
  const byMonth = new Map<string, AlternanceWeek[]>();
  for (const w of inContract) {
    const key = format(addDays(parseISO(w.weekStart), 3), "yyyy-MM");
    byMonth.set(key, [...(byMonth.get(key) ?? []), w]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Calendrier d&apos;alternance</h1>
        <p className="mt-2 text-sm text-slate-600">
          {formatStudentName(student.firstName, student.lastName)}
          {student.class?.name ? ` · ${student.class.name}` : ""} · contrat du{" "}
          {format(contractStart, "d MMM yyyy", { locale: fr })} au {format(contractEnd, "d MMM yyyy", { locale: fr })}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Une semaine est « à l&apos;école » dès qu&apos;au moins un cours est planifié pour la classe de l&apos;apprenti ;
          sinon il est attendu en entreprise. Le calendrier se met à jour automatiquement avec le planning.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cette semaine</p>
          <p className="mt-2 text-lg font-semibold">
            {currentWeek ? STATUS_STYLE[currentWeek.status].label : "Hors contrat"}
          </p>
          {currentWeek && currentWeek.lessonCount > 0 && (
            <p className="text-sm text-slate-500">
              {currentWeek.lessonCount} cours · {currentWeek.hours} h
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Prochain changement</p>
          <p className="mt-2 text-lg font-semibold">
            {nextChange ? `${STATUS_STYLE[nextChange.status].label}` : "Aucun connu"}
          </p>
          {nextChange && (
            <p className="text-sm text-slate-500">
              dès la semaine du {format(parseISO(nextChange.weekStart), "d MMMM", { locale: fr })}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Répartition du contrat</p>
          <p className="mt-2 text-sm">
            <span className="font-semibold text-blue-700">{count("SCHOOL")}</span> sem. école ·{" "}
            <span className="font-semibold text-emerald-700">{count("COMPANY")}</span> sem. entreprise
          </p>
          {count("UNKNOWN") > 0 && (
            <p className="text-xs text-slate-500">{count("UNKNOWN")} semaine(s) sans planning publié</p>
          )}
        </div>
      </section>

      <ul className="flex flex-wrap gap-4 text-xs text-slate-600">
        {(Object.keys(STATUS_STYLE) as AlternanceWeekStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${STATUS_STYLE[s].dot}`} />
            {STATUS_STYLE[s].label}
          </li>
        ))}
      </ul>

      <section className="space-y-6">
        {[...byMonth.entries()].map(([month, monthWeeks]) => (
          <div key={month}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
              {format(parseISO(`${month}-01`), "MMMM yyyy", { locale: fr })}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {monthWeeks.map((w) => (
                <div
                  key={w.weekStart}
                  className={`rounded-xl border p-3 ${STATUS_STYLE[w.status].cell} ${
                    currentWeek?.weekStart === w.weekStart ? "ring-2 ring-slate-900" : ""
                  }`}
                >
                  <p className="text-xs font-semibold">{weekRange(w.weekStart)}</p>
                  <p className="mt-1 text-sm font-bold">{STATUS_STYLE[w.status].label}</p>
                  {w.lessonCount > 0 && (
                    <p className="text-xs opacity-80">
                      {w.lessonCount} cours · {w.hours} h
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Périodes</h2>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {periods.map((p) => (
            <li key={`${p.status}-${p.startWeek}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[p.status].dot}`} />
                {STATUS_STYLE[p.status].label}
              </span>
              <span className="text-slate-600">
                du {format(parseISO(p.startWeek), "d MMM", { locale: fr })} au{" "}
                {format(addDays(parseISO(p.endWeek), 4), "d MMM yyyy", { locale: fr })}
              </span>
              <span className="text-xs text-slate-400">{p.weeks} sem.</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
