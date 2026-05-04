"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export default function EmployerDashboardClient({ students }: { students: any[] }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-sans text-slate-900 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tableau de Bord Entreprise</h1>
        <p className="mt-2 text-sm text-slate-600">Suivi des alternants sous votre tutorat.</p>
      </div>

      <div className="grid gap-6">
        {students.map((s) => (
          <div key={s.studentId} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{s.name}</h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">{s.class}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">{s.contractType}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fin de contrat</p>
                <p className="text-sm font-bold text-slate-700">{format(new Date(s.endDate), 'dd MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Attendance Section */}
              <div className="p-6 sm:p-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Dernières Absences / Retards</h3>
                {s.absences.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Aucun incident signalé.</p>
                ) : (
                  <ul className="space-y-3">
                    {s.absences.map((a: any, i: number) => (
                      <li key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{a.subject}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{format(new Date(a.date), 'dd/MM HH:mm')}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${a.status === 'LATE' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {a.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={`/employer/absences?studentId=${s.studentId}`} className="mt-6 inline-block text-xs font-bold text-blue-600 hover:underline">
                  Consulter tout l'historique →
                </Link>
              </div>

              {/* Skills Section */}
              <div className="p-6 sm:p-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Compétences Clés (Evaluations)</h3>
                {s.skills.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Aucune évaluation de compétences enregistrée.</p>
                ) : (
                  <div className="space-y-4">
                    {s.skills.map((skill: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-700">{skill.name}</span>
                          <span className="text-blue-600">{skill.level}/5</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all" style={{ width: `${(skill.level / 5) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/employer/grades?studentId=${s.studentId}`} className="mt-6 inline-block text-xs font-bold text-blue-600 hover:underline">
                  Voir le bulletin détaillé →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
