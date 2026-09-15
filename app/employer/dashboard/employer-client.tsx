"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import MeetingRequestForm from "@/components/meetings/meeting-request-form";
import { Calendar, Clock, GraduationCap, MapPin, User, ArrowRight } from "lucide-react";

export default function EmployerDashboardClient({ 
  students, 
  enableMeetings = true 
}: { 
  students: any[]; 
  enableMeetings?: boolean;
}) {
  return (
    <div className="min-h-full flex flex-col gap-6 font-sans text-slate-900 max-w-7xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase tracking-widest">
            Dashboard Tuteur Entreprise
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Suivi pédagogique, assiduité et planning des alternants
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-6">
        {students.map((s) => (
          <div key={s.studentId} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col space-y-6 p-6">
            {/* Student Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-lg shadow-sm">
                  {s.name.split(' ')[0]?.[0] || 'A'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">{s.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {s.class}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                      {s.contractType === 'APPRENTICESHIP' ? 'Apprentissage' : 'Stage'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right shrink-0 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Fin de contrat</p>
                <p className="text-xs font-black text-slate-700 mt-1 uppercase">
                  {format(new Date(s.endDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            {/* Desktop 3-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Column 1: Prochains Cours & Planning (5 cols on Desktop) */}
              <div className="lg:col-span-5 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Planning & Prochains Cours</span>
                  </h3>
                  <Link 
                    href={`/employer/planning?studentId=${s.studentId}`} 
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Emploi du temps <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {(!s.upcomingLessons || s.upcomingLessons.length === 0) ? (
                  <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 font-bold italic">
                    Aucun cours à venir programmé.
                  </div>
                ) : (
                  <div className="space-y-2.5 flex-1">
                    {s.upcomingLessons.map((l: any) => (
                      <div key={l.id} className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-sm hover:border-blue-200 transition">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-black text-slate-900 line-clamp-1">{l.subject}</h4>
                          <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                            {format(new Date(l.startTime), 'EEE dd/MM', { locale: fr })}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-bold">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {format(new Date(l.startTime), 'HH:mm')} - {format(new Date(l.endTime), 'HH:mm')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {l.room}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <User className="h-3 w-3 text-slate-400" />
                            {l.teacher}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Assiduité & Absences (4 cols on Desktop) */}
              <div className="lg:col-span-4 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Assiduité & Relevé</span>
                  </h3>
                  <Link 
                    href={`/employer/absences?studentId=${s.studentId}`} 
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Historique <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {s.absences.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 font-bold italic">
                    Aucune absence ou retard signalé.
                  </div>
                ) : (
                  <ul className="space-y-2 flex-1">
                    {s.absences.map((a: any, i: number) => (
                      <li key={i} className="flex justify-between items-center bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/70 shadow-sm gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{a.subject}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{format(new Date(a.date), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${a.status === 'LATE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {a.status === 'LATE' ? 'RETARD' : 'ABSENCE'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Column 3: Compétences (3 cols on Desktop) */}
              <div className="lg:col-span-3 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                    <span>Livret de Compétences</span>
                  </h3>
                  <Link 
                    href={`/employer/livret?studentId=${s.studentId}`} 
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                  >
                    Livret →
                  </Link>
                </div>

                {s.skills.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 font-bold italic">
                    Aucune compétence évaluée.
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    {s.skills.slice(0, 4).map((skill: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-[10px] font-black mb-1">
                          <span className="text-slate-700 truncate mr-2">{skill.name}</span>
                          <span className="text-blue-600 shrink-0">{skill.level}/5</span>
                        </div>
                        <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all rounded-full" style={{ width: `${(skill.level / 5) * 100}%` }}></div>
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

      {enableMeetings && (
        <div className="shrink-0 w-full max-w-lg mt-2">
          <MeetingRequestForm />
        </div>
      )}
    </div>
  );
}
