import type { Grade } from "@prisma/client";

type GradeLite = {
  value: number;
  coefficient: number;
};

function weightedAverage(grades: GradeLite[]): number | null {
  if (grades.length === 0) return null;
  let sumWx = 0;
  let sumC = 0;
  for (const g of grades) {
    const c =
      Number.isFinite(g.coefficient) && g.coefficient > 0 ? g.coefficient : 1;
    sumWx += g.value * c;
    sumC += c;
  }
  if (sumC <= 0) return null;
  return sumWx / sumC;
}

function toneForNote(note: number): "high" | "low" | "mid" {
  if (note > 15) return "high";
  if (note < 10) return "low";
  return "mid";
}

function gradeBadgeClasses(note: number) {
  const t = toneForNote(note);
  if (t === "high") {
    return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  }
  if (t === "low") {
    return "bg-orange-100 text-orange-950 ring-orange-300";
  }
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

function formatFrAvg(n: number) {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type SubjectLite = { id: string; name: string };

type Props = {
  student: {
    user: { firstName: string; lastName: string; email: string };
    class: { name: string };
    grades: Grade[];
  };
  subjectsFromDb: SubjectLite[];
  /** Bandeau informatif (ex. consultation parent). */
  contextNote?: string;
};

export default function GradesBody({
  student,
  subjectsFromDb,
  contextNote,
}: Props) {
  const subjectByExactName = new Map(
    subjectsFromDb.map((s) => [s.name.trim(), s] as const),
  );

  const grades = student.grades;
  const generalAvg = weightedAverage(grades.map((g) => g));

  const bySubjectLabel = new Map<string, typeof grades>();
  for (const g of grades) {
    const key = g.subjectName.trim();
    const list = bySubjectLabel.get(key) ?? [];
    list.push(g);
    bySubjectLabel.set(key, list);
  }

  const summaryBySubject = [...bySubjectLabel.entries()]
    .map(([subjectLabel, list]) => {
      const avg = weightedAverage(list.map((x) => x));
      const linkedSubject = subjectByExactName.get(subjectLabel);
      return {
        subjectLabel,
        linkedSubjectId: linkedSubject?.id ?? null,
        displayName: linkedSubject?.name ?? subjectLabel,
        average: avg,
        count: list.length,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      {contextNote ? (
        <div className="mb-6 rounded-xl border border-sky-200/90 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          {contextNote}
        </div>
      ) : null}

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Notes & moyennes
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">
            {student.user.lastName} {student.user.firstName}
          </span>
          {" · "}
          <span className="text-slate-500">{student.user.email}</span>
          {" · "}
          <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200">
            Classe : {student.class.name}
          </span>
        </p>
      </header>

      {grades.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-900/[0.04]">
          Aucune note enregistrée pour cet élève.
        </p>
      ) : (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Moyenne générale pondérée
              </p>
              <p className="mt-1 text-xs text-slate-500">Σ(note × coef) / Σ(coef)</p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <span
                  className={`inline-flex rounded-full px-4 py-1.5 text-2xl font-semibold tabular-nums ring-1 ${generalAvg != null ? gradeBadgeClasses(generalAvg) : "bg-slate-100 text-slate-500 ring-slate-200"}`}
                >
                  {generalAvg != null ? `${formatFrAvg(generalAvg)} / 20` : "—"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Synthèse
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  <span className="font-medium text-slate-800">{grades.length}</span> note(s)
                  •{" "}
                  <span className="font-medium text-slate-800">
                    {summaryBySubject.length}
                  </span>{" "}
                  matière(s)
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">
              Moyennes par matière
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {summaryBySubject.map((s) => (
                <li
                  key={s.subjectLabel}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-900/[0.04]"
                >
                  <div>
                    <p className="font-medium text-slate-900">{s.displayName}</p>
                    {s.linkedSubjectId ? (
                      <p className="text-xs font-mono text-slate-400">
                        Subject.id : {s.linkedSubjectId.slice(0, 8)}…
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700">
                        Nom non retrouvé dans Subject (affichage libellé stocké).
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {s.count} entrée{s.count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ring-1 ${s.average != null ? gradeBadgeClasses(s.average) : "bg-slate-100 text-slate-500 ring-slate-200"}`}
                  >
                    {s.average != null ? `${formatFrAvg(s.average)} / 20` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">
              Détail des notes
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700"
                      >
                        Matière
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-700"
                      >
                        Note
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-700"
                      >
                        Coef.
                      </th>
                      <th
                        scope="col"
                        className="min-w-[10rem] px-5 py-3.5 font-semibold text-slate-700"
                      >
                        Commentaire
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-600">
                          {g.date.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-slate-900">
                            {subjectByExactName.has(g.subjectName.trim())
                              ? subjectByExactName.get(g.subjectName.trim())!.name
                              : g.subjectName}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span
                            className={`inline-flex min-w-[3.75rem] justify-end rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ring-1 ${gradeBadgeClasses(g.value)}`}
                          >
                            {g.value.toLocaleString("fr-FR", {
                              minimumFractionDigits: Number.isInteger(g.value)
                                ? 0
                                : 1,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm tabular-nums text-slate-600">
                          {g.coefficient.toLocaleString("fr-FR", {
                            minimumFractionDigits: Number.isInteger(g.coefficient)
                              ? 0
                              : 1,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {g.comment ?? (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
