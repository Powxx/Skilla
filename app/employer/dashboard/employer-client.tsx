"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import MeetingRequestForm from "@/components/meetings/meeting-request-form";

export default function EmployerDashboardClient({ students }: { students: any[] }) {
  return (
    <div className="h-full flex flex-col gap-6 font-sans text-slate-900">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Dashboard Tuteur</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Suivi des alternants Skilla Academy</p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
        {students.map((s) => (
          <div key={s.studentId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-900 uppercase truncate">{s.name}</h2>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1 rounded">{s.class}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-white border border-slate-100 px-1 rounded">{s.contractType}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none">Fin contrat</p>
                <p className="text-[10px] font-black text-slate-700 mt-1 uppercase">{format(new Date(s.endDate), 'dd MMM yy', { locale: fr })}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-0">
              {/* Attendance Section */}
              <div className="p-5 flex flex-col min-h-0">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                   <span>Absences & Retards</span>
                   <Link href={`/employer/absences?studentId=${s.studentId}`} className="text-blue-600 hover:underline tracking-tighter">Historique →</Link>
                </h3>
                {s.absences.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase italic">RAS.</div>
                ) : (
                  <ul className="space-y-2">
                    {s.absences.map((a: any, i: number) => (
                      <li key={i} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100/50">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-800 truncate uppercase tracking-tighter">{a.subject}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">{format(new Date(a.date), 'dd/MM HH:mm')}</p>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${a.status === 'LATE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {a.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Skills Section */}
              <div className="p-5 flex flex-col min-h-0">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                   <span>Compétences</span>
                   <Link href={`/employer/livret?studentId=${s.studentId}`} className="text-blue-600 hover:underline tracking-tighter">Livret →</Link>
                </h3>
                {s.skills.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase italic">En attente.</div>
                ) : (
                  <div className="space-y-3">
                    {s.skills.slice(0, 3).map((skill: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-[9px] font-black mb-1 uppercase">
                          <span className="text-slate-600 truncate mr-2">{skill.name}</span>
                          <span className="text-blue-600 shrink-0">{skill.level}/5</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all" style={{ width: `${(skill.level / 5) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 max-w-sm">
        <MeetingRequestForm />
      </div>
    </div>
  );
}
