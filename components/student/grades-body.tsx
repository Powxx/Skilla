"use client";

import { useState } from "react";
import type { User, Class, Grade } from "@prisma/client";

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

interface ReportCardLite {
  id: string;
  generalAppraisal: string | null;
  distinction: string | null;
  semesterId: string;
  semester: {
    name: string;
  };
}

type SemesterLite = {
  id: string;
  name: string;
  schoolYear?: string | null;
};

type Props = {
  student: User & {
    class: Class | null;
    grades: (Grade & { semester?: { name: string } | null })[];
    reportCards: ReportCardLite[];
  };
  subjectsFromDb: SubjectLite[];
  semesters: SemesterLite[];
  /** Bandeau informatif (ex. consultation parent). */
  contextNote?: string;
  reportCardsVisible?: boolean;
};

export default function GradesBody({
  student,
  subjectsFromDb,
  semesters,
  contextNote,
  reportCardsVisible = true,
}: Props) {
  const [selectedSemesterId, setSelectedSemesterId] = useState(
    semesters[0]?.id || ""
  );

  const subjectByExactName = new Map(
    subjectsFromDb.map((s) => [s.name.trim(), s] as const),
  );

  // Filter grades and report cards by selected semester
  const grades = selectedSemesterId
    ? student.grades.filter((g: Grade) => g.semesterId === selectedSemesterId)
    : student.grades;
  const filteredReportCards = selectedSemesterId
    ? student.reportCards.filter((rc: ReportCardLite) => rc.semesterId === selectedSemesterId)
    : student.reportCards;

  const generalAvg = weightedAverage(grades.map((g: Grade) => g));

  const bySubjectLabel = new Map<string, typeof grades>();
  for (const g of grades) {
    const key = g.subjectName?.trim() ?? "Inconnue";
    const list = bySubjectLabel.get(key) ?? [];
    list.push(g);
    bySubjectLabel.set(key, list);
  }

  const summaryBySubject = [...bySubjectLabel.entries()]
    .map(([subjectLabel, list]) => {
      const avg = weightedAverage(list.map((x: Grade) => x));
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
    <div className="mx-auto max-w-5xl text-slate-900">
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
            {student.lastName} {student.firstName}
          </span>
          {" · "}
          <span className="text-slate-500">{student.email}</span>
          {" · "}
          <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200">
            Classe : {student.class?.name ?? "Non assignée"}
          </span>
        </p>

        {/* Semester selector */}
        {semesters.length > 1 && (
          <div className="mt-4 flex items-center gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Semestre :
            </label>
            <select
              className="rounded-xl border-slate-200 text-sm font-bold focus:ring-slate-900 focus:border-slate-900 h-10"
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.schoolYear ? ` (${s.schoolYear})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {grades.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-900/[0.04]">
          Aucune note enregistrée pour ce semestre.
        </p>
      ) : (
        <>
          {reportCardsVisible && filteredReportCards.length > 0 && (
            <section className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
               <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                 <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                 Bulletin du semestre
               </h2>
               <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-8 shadow-xl ring-1 ring-blue-900/5">
                 <div className="absolute top-0 right-0 p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">OFFICIEL</span>
                 </div>
                 <div className="relative z-10">
                   <p className="text-slate-700 leading-relaxed italic text-lg font-medium">
                     &quot;{filteredReportCards[0].generalAppraisal}&quot;
                   </p>
                   {filteredReportCards[0].distinction && (
                     <div className="mt-6 flex items-center gap-3">
                       <span className="h-px w-8 bg-blue-200"></span>
                       <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                         Mention : {filteredReportCards[0].distinction}
                       </span>
                       <span className="h-px w-8 bg-blue-200"></span>
                     </div>
                   )}
                 </div>
                 <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-blue-50/50 blur-3xl"></div>
               </div>
            </section>
          )}

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
                <li>
                  Semestre : <span className="font-medium text-slate-800">{semesters.find((s) => s.id === selectedSemesterId)?.name || "Tous"}</span>
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
              Détail des notes{selectedSemesterId && ` — ${semesters.find((s) => s.id === selectedSemesterId)?.name || ""}`}
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
                    {grades.map((g: Grade) => (
                      <tr key={g.id} className="hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-600">
                          {new Date(g.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-slate-900">
                            {g.subjectName && subjectByExactName.has(g.subjectName.trim())
                              ? subjectByExactName.get(g.subjectName.trim())!.name
                              : (g.subjectName || "Inconnue")}
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
