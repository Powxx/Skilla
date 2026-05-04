"use client";

import Link from "next/link";
import { format } from "date-fns";
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
    <div className="mx-auto max-w-6xl px-4 py-8 font-sans text-slate-900 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl text-slate-900">
          Bonjour, {studentDisplayName.split(' ')[1] || studentDisplayName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Voici un résumé de votre situation actuelle à la <span className="font-bold text-slate-700">Skilla Academy</span>.
        </p>
      </div>

      {/* Main Stats Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Prochain Cours</p>
            {nextLesson ? (
              <div className="mt-4">
                <h3 className="text-2xl font-bold">{nextLesson.subjectName}</h3>
                <p className="text-slate-300 mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {format(new Date(nextLesson.startTime), 'HH:mm')} — {nextLesson.roomName}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-slate-400 italic">Aucun cours prévu prochainement.</p>
            )}
          </div>
          <Link href="/student/planning" className="mt-6 text-xs font-bold bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-full inline-block w-fit">
            Voir mon emploi du temps →
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Moyenne</p>
          <div className="mt-4">
            <span className="text-4xl font-black text-slate-900">
              {generalAverage != null ? formatAvg(generalAverage) : "—"}
            </span>
            <span className="text-lg font-bold text-slate-400 ml-1">/20</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {rank ? `Rang: ${rank} / ${classSize}` : "Rang indisponible"}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Assiduité</p>
          <div className="mt-4">
            <span className="text-4xl font-black text-slate-900">{Math.round(attendanceRate)}%</span>
          </div>
          <Link href={absencesDetailHref} className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-tighter hover:underline">
            {absenceCount} absence(s) • {delayCount} retard(s)
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Évolution de vos résultats</h2>
                <p className="text-xs text-slate-500 font-medium">Suivi chronologique des dernières notes</p>
              </div>
            </div>

            {chartRows.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 font-medium italic">
                En attente des premières évaluations...
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dateLabel" hide />
                    <YAxis domain={[0, 20]} hide />
                    <Tooltip
                      contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", padding: "12px" }}
                      formatter={(v: any, _: any, p: any) => [`${v}/20`, p.payload.subjectName]}
                    />
                    <Line type="monotone" dataKey="note" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: "#3b82f6", stroke: "#fff", strokeWidth: 3 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Prochains Devoirs</h3>
            <div className="space-y-4">
              {upcomingHomework.length > 0 ? upcomingHomework.map((hw, idx) => (
                <div key={idx} className="group p-3 rounded-2xl border border-slate-50 bg-slate-50/30 hover:border-blue-100 hover:bg-blue-50/30 transition">
                   <div className="flex justify-between items-start mb-1">
                     <p className="text-xs font-bold text-blue-600">{hw.subjectName}</p>
                     <p className="text-[10px] text-slate-400 font-bold">{format(new Date(hw.date), 'dd/MM')}</p>
                   </div>
                   <p className="text-sm text-slate-700 line-clamp-2 leading-tight">{hw.content}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic">Aucun devoir à faire.</p>
              )}
            </div>
            <Link href="/student/planning" className="mt-4 block text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Voir l'agenda complet →</Link>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Dernière Note</h3>
            {lastGrade ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{lastGrade.subjectName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{format(new Date(lastGrade.date), 'dd MMM yyyy', { locale: fr })}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                  <span className="text-sm font-black text-blue-700">{lastGrade.value}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Pas encore de note.</p>
            )}
          </section>

          <section className="rounded-3xl bg-blue-600 p-6 shadow-lg text-white">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">Profil</h3>
            <p className="text-lg font-bold">{classLabel}</p>
            <p className="text-xs opacity-70 mt-1">{studentEmail}</p>
            <button className="mt-6 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition">
              Paramètres du compte
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
