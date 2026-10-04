"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toggleStudentHomeworkDone } from "@/app/actions/homework";
import Link from "next/link";
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from "date-fns/locale";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MeetingRequestForm from "@/components/meetings/meeting-request-form";
import { BookOpen, Calendar, ChevronDown, ChevronUp, X, CheckCircle2, Circle, ArrowRight } from "lucide-react";

export type DashboardChartRow = {
  dateLabel: string;
  note: number;
  coefficient: number;
  subjectName: string;
  isoDate: string;
};

export type DashboardClientProps = {
  studentDisplayName: string;
  studentEmail: string;
  classLabel: string;
  generalAverage: number | null;
  chartRows: DashboardChartRow[];
  absenceCount: number;
  delayCount: number;
  attendanceRate?: number;
  rank?: number | null;
  classSize?: number;
  lastGrade?: { value: number; subjectName: string; date: string } | null;
  nextLesson?: { subjectName: string; startTime: string; roomName: string } | null;
  upcomingHomework?: { id?: string; subjectName: string; content: string; date: string }[];
  initialDoneLessonIds?: string[];
  absencesDetailHref: string;
  enableMeetings?: boolean;
};

function formatAvg(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StudentDashboardClient({
  studentDisplayName,
  studentEmail,
  classLabel,
  generalAverage,
  chartRows,
  absenceCount,
  delayCount,
  attendanceRate = 100,
  rank,
  classSize,
  lastGrade,
  nextLesson,
  upcomingHomework = [],
  initialDoneLessonIds = [],
  absencesDetailHref,
  enableMeetings = true,
}: DashboardClientProps) {
  const [selectedHw, setSelectedHw] = useState<{ subjectName: string; content: string; date: string } | null>(null);
  const [expandedHwIndex, setExpandedHwIndex] = useState<number | null>(null);
  const [doneHomeworks, setDoneHomeworks] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialMap: Record<string, boolean> = {};
    if (initialDoneLessonIds && initialDoneLessonIds.length > 0) {
      initialDoneLessonIds.forEach((id) => {
        initialMap[`hw_${id}`] = true;
      });
    }
    try {
      const stored = localStorage.getItem("skilla_student_hw_done");
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(initialMap, parsed);
      }
    } catch (e) {}
    setDoneHomeworks(initialMap);
  }, [initialDoneLessonIds]);

  const toggleHomeworkDone = (hw: { id?: string; subjectName: string; content: string; date: string }) => {
    const hwKey = hw.id ? `hw_${hw.id}` : `${hw.subjectName}_${hw.date}_${hw.content.slice(0, 20)}`;
    const legacyKey = `${hw.subjectName}_${hw.date}_${hw.content.slice(0, 20)}`;
    const current = Boolean(doneHomeworks[hwKey] || doneHomeworks[legacyKey]);
    const nextState = !current;

    setDoneHomeworks(prev => {
      const updated = { ...prev, [hwKey]: nextState, [legacyKey]: nextState };
      try {
        localStorage.setItem("skilla_student_hw_done", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (hw.id) {
      toggleStudentHomeworkDone(hw.id).catch(err =>
        console.error("toggleStudentHomeworkDone error:", err)
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col gap-4 font-sans text-slate-900 pb-10">
      {/* Mini Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
            {studentDisplayName} • {classLabel}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <div className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between sm:justify-start gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Moyenne</span>
              <span className="text-sm font-black text-blue-600">{generalAverage != null ? formatAvg(generalAverage) : "—"}</span>
           </div>
           <div className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between sm:justify-start gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Assiduité</span>
              <span className="text-sm font-black text-emerald-600">{Math.round(attendanceRate)}%</span>
           </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Col: Main Info (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Prochain Cours</p>
              {nextLesson ? (
                <div className="mt-3">
                  <h3 className="text-xl font-black leading-tight">{nextLesson.subjectName}</h3>
                  <p className="text-white/60 text-xs mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {formatInTimeZone(new Date(nextLesson.startTime), 'Europe/Paris', 'HH:mm')} — {nextLesson.roomName}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-white/40 text-xs italic">Aucun cours prévu.</p>
              )}
              <Link href="/student/planning" className="mt-4 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded-lg inline-block">
                Emploi du temps →
              </Link>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl -mr-10 -mt-10 rounded-full"></div>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col min-h-[260px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                Prochains Devoirs
              </h3>
              <div className="flex items-center gap-2">
                {upcomingHomework.length > 0 && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                    {upcomingHomework.filter(hw => !doneHomeworks[`${hw.subjectName}_${hw.date}_${hw.content.slice(0, 20)}`]).length} restant(s)
                  </span>
                )}
                <Link
                  href="/student/devoirs"
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 transition"
                  title="Voir tout le cahier de texte"
                >
                  Tout voir <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            </div>
            <div className="flex-1 min-h-[160px] max-h-[380px] overflow-y-auto space-y-3 pr-1.5 custom-scrollbar">
              {upcomingHomework.length > 0 ? upcomingHomework.map((hw, idx) => {
                const hwKey = `${hw.subjectName}_${hw.date}_${hw.content.slice(0, 20)}`;
                const isDone = Boolean(doneHomeworks[hwKey]);
                const isExpanded = expandedHwIndex === idx;
                const isLong = hw.content.length > 100;
                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border transition cursor-pointer group ${
                      isDone 
                        ? 'border-emerald-200 bg-emerald-50/30 opacity-80' 
                        : 'border-slate-100 bg-slate-50/70 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      if (isLong) {
                        setExpandedHwIndex(isExpanded ? null : idx);
                      } else {
                        setSelectedHw(hw);
                      }
                    }}
                  >
                     <div className="flex justify-between items-start mb-1.5 gap-2">
                       <div className="flex items-center gap-1.5">
                         <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             toggleHomeworkDone(hw);
                           }}
                           className="text-slate-400 hover:text-emerald-600 transition"
                           title={isDone ? "Marquer comme à faire" : "Marquer comme terminé"}
                         >
                           {isDone ? (
                             <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                           ) : (
                             <Circle className="h-4 w-4" />
                           )}
                         </button>
                         <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter bg-blue-50/80 px-1.5 py-0.5 rounded">
                           {hw.subjectName}
                         </span>
                       </div>
                       <div className="flex items-center gap-1.5">
                         {isDone && (
                           <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                             Fait ✓
                           </span>
                         )}
                         <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                           <Calendar className="h-3 w-3" />
                           {new Date(hw.date.replace('Z', '')).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                         </span>
                       </div>
                     </div>
                     <p className={`text-xs leading-relaxed break-words whitespace-pre-wrap ${isDone ? 'text-slate-500 line-through' : 'text-slate-700'} ${!isExpanded ? 'line-clamp-3' : 'max-h-56 overflow-y-auto custom-scrollbar p-2.5 bg-white rounded-lg border border-slate-100'}`}>
                       {hw.content}
                     </p>
                     <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100/60 text-[10px]">
                       <button 
                         type="button" 
                         onClick={(e) => {
                           e.stopPropagation();
                           setSelectedHw(hw);
                         }}
                         className="text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
                       >
                         Détails complets →
                       </button>
                       {isLong && (
                         <span className="text-slate-400 flex items-center gap-0.5 font-medium">
                           {isExpanded ? (
                             <>Réduire <ChevronUp className="h-3 w-3" /></>
                           ) : (
                             <>Déplier <ChevronDown className="h-3 w-3" /></>
                           )}
                         </span>
                       )}
                     </div>
                  </div>
                );
              }) : (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4">
                  <BookOpen className="h-6 w-6 text-slate-300 mb-1" />
                  <p className="text-xs text-slate-400 italic">Aucun devoir à faire.</p>
                </div>
              )}
            </div>
          </section>

          {enableMeetings && <MeetingRequestForm />}
        </div>

        {/* Middle Col: Chart (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
          <section className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-h-0">
            <div className="mb-4">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Progression</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">Historique des évaluations</p>
            </div>

            <div className="flex-1 w-full min-h-[200px]">
              {chartRows.length === 0 ? (
                <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Aucune donnée
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows} margin={{ top: 5, right: 5, bottom: 5, left: -30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dateLabel" hide />
                    <YAxis domain={[0, 20]} stroke="#cbd5e1" fontSize={10} tickCount={5} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", padding: "8px" }}
                      itemStyle={{ fontSize: "10px", fontWeight: "bold" }}
                    />
                    <Line type="monotone" dataKey="note" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4 shrink-0">
             <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-24">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rang</span>
                <div className="mt-1">
                  <span className="text-2xl font-black text-slate-900">{rank || "—"}</span>
                  <span className="text-[10px] font-bold text-slate-400 ml-1">/ {classSize}</span>
                </div>
             </div>
             <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-24">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retards</span>
                <div className="mt-1">
                  <span className="text-2xl font-black text-amber-600">{delayCount}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Details (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dernière Note</h3>
            {lastGrade ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate leading-tight">{lastGrade.subjectName}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{new Date(lastGrade.date.replace('Z', '')).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                  <span className="text-xs font-black text-blue-700">{lastGrade.value}</span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">Pas encore de note.</p>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col min-h-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Absences</h3>
            <div className="flex items-center gap-4 mb-4 shrink-0">
               <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                  <span className="text-xl font-black text-red-600">{absenceCount}</span>
               </div>
               <div>
                  <p className="text-xs font-black text-slate-800">Total absences</p>
                  <Link href={absencesDetailHref} className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Détails →</Link>
               </div>
            </div>
            
            <div className="mt-auto p-4 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 text-white shrink-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Profil</p>
              <p className="text-xs font-black mt-1 truncate">{classLabel}</p>
              <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition">
                Profil
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Modal pour afficher les devoirs en entier avec scrollbar */}
      {mounted && selectedHw && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg min-w-[320px] max-h-[85vh] my-auto shadow-2xl relative flex flex-col overflow-hidden border border-slate-100">
            <button 
              onClick={() => setSelectedHw(null)} 
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="pr-8 mb-3 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                {selectedHw.subjectName}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                Devoirs à faire
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Pour le : {new Date(selectedHw.date.replace('Z', '')).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed select-text min-h-[100px]">
              {selectedHw.content}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedHw(null)} 
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
