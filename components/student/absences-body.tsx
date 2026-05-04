import type { Attendance, User, Class, Lesson, Subject } from "@prisma/client";

function statusLabel(status: string) {
  if (status === "EXCUSED") return "Justifié";
  return "Non justifié";
}

function isJustifiedAttendance(status: string) {
  return status === "EXCUSED";
}

function typeLabel(status: string) {
  if (status === "ABSENT") return "Absence";
  if (status === "LATE") return "Retard";
  if (status === "EXCUSED") return "Absence justifiée";
  return status;
}

type AttendanceWithLesson = Attendance & {
  lesson: Lesson & { subject: Subject };
  lateDuration?: number | null;
};

type Props = {
  student: User & {
    class: Class | null;
    attendances: AttendanceWithLesson[];
  };
  contextNote?: string;
};

export default function AbsencesBody({ student, contextNote }: Props) {
  const absencesOnly = student.attendances.filter(
    (a) => a.status === "ABSENT" || a.status === "EXCUSED",
  );
  const retardsOnly = student.attendances.filter(
    (a) => a.status === "LATE",
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      {contextNote ? (
        <div className="mb-8 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          {contextNote}
        </div>
      ) : null}

      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Absences & retards
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {student.lastName} {student.firstName} · {student.class?.name ?? "Non assignée"}
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Absences totales
          </p>
          <p className="mt-3 text-4xl font-semibold tabular-nums text-slate-900">
            {absencesOnly.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Retards totaux
          </p>
          <p className="mt-3 text-4xl font-semibold tabular-nums text-slate-900">
            {retardsOnly.length}
          </p>
        </div>
      </div>

      {student.attendances.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center text-sm text-slate-500">
          Aucune absence ni retard enregistré pour le moment.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Historique</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {student.attendances.map((a) => {
              if (a.status === "PRESENT") return null;

              const justified = isJustifiedAttendance(a.status);
              const unjustifiedVis = !justified ? (
                <span
                  className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 ring-2 ring-white"
                  title="Non justifié"
                  aria-label="Événement non justifié (pastille rouge)"
                />
              ) : (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400"
                  title="Justifié"
                  aria-hidden
                />
              );

              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:flex-nowrap"
                >
                  <div className="flex min-w-[2rem] items-center justify-start sm:justify-center">
                    {unjustifiedVis}
                  </div>
                  <div className="min-w-[6.5rem] text-sm tabular-nums text-slate-600">
                    {new Date(a.lesson.startTime).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="flex min-w-[6rem] flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${a.status === "ABSENT" || a.status === "EXCUSED"
                          ? "bg-red-50 text-red-900 ring-red-200/90"
                          : "bg-orange-50 text-orange-950 ring-orange-200/90"}`}
                      >
                        {typeLabel(a.status)}
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {a.lesson.subject.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-900 mt-1">
                      {statusLabel(a.status)}
                    </span>
                    {a.status === "LATE" && a.lateDuration ? (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-100/50 w-fit px-2 py-0.5 rounded-md border border-orange-200">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Retard de {a.lateDuration} min
                      </span>
                    ) : null}
                    {a.reason ? (
                      <span className="line-clamp-2 text-xs text-slate-500 mt-1 italic">
                        &ldquo;{a.reason}&rdquo;
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
