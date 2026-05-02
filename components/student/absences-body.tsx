import type { Attendance } from "@prisma/client";

function statusLabel(raw: string) {
  const s = raw?.toUpperCase() ?? "";
  if (s === "JUSTIFIE" || s === "JUSTIFIÉ") return "Justifié";
  return "Non justifié";
}

function isJustifiedAttendance(status: string) {
  const s = status?.toUpperCase() ?? "";
  return s === "JUSTIFIE" || s === "JUSTIFIÉ";
}

function typeLabel(t: string) {
  const u = (t ?? "").toUpperCase();
  if (u === "ABSENCE") return "Absence";
  if (u === "RETARD") return "Retard";
  return t;
}

type Props = {
  student: {
    user: { firstName: string; lastName: string };
    class: { name: string };
    attendances: Attendance[];
  };
  contextNote?: string;
};

export default function AbsencesBody({ student, contextNote }: Props) {
  const absencesOnly = student.attendances.filter(
    (a) => a.type.toUpperCase() === "ABSENCE",
  );
  const retardsOnly = student.attendances.filter(
    (a) => a.type.toUpperCase() === "RETARD",
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
          {student.user.lastName} {student.user.firstName} · {student.class.name}
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
                    {a.date.toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="flex min-w-[6rem] flex-1 flex-col gap-0.5">
                    <span
                      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${a.type.toUpperCase() === "ABSENCE"
                        ? "bg-red-50 text-red-900 ring-red-200/90"
                        : "bg-orange-50 text-orange-950 ring-orange-200/90"}`}
                    >
                      {typeLabel(a.type)}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {statusLabel(a.status)}
                    </span>
                    {a.reason ? (
                      <span className="line-clamp-2 text-xs text-slate-500">
                        {a.reason}
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
