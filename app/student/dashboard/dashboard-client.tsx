"use client";

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
  upcomingHomework?: { subjectName: string; content: string; date: string }[];
  absencesDetailHref: string;
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
  absencesDetailHref,
}: DashboardClientProps) {
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
                    {formatInTimeZone(new Date(new Date(nextLesson.startTime).getTime() + 7200000), 'Europe/Paris', 'HH:mm')} — {nextLesson.roomName}
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

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col min-h-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Prochains Devoirs</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {upcomingHomework.length > 0 ? upcomingHomework.map((hw, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-50 bg-slate-50/50 hover:border-blue-100 transition">
                   <div className="flex justify-between items-start mb-1">
                     <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{hw.subjectName}</p>
                     <p className="text-[9px] text-slate-400 font-bold">{new Date(hw.date.replace('Z', '')).toLocaleDateString('fr-FR')}</p>
                   </div>
                   <p className="text-xs text-slate-700 leading-snug line-clamp-2">{hw.content}</p>
                </div>
              )) : (
                <p className="text-[10px] text-slate-400 italic">Aucun devoir.</p>
              )}
            </div>
          </section>

          <MeetingRequestForm />
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
    </div>
  );
}
