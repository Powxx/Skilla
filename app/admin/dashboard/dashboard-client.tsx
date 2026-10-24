"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import {
  Users,
  GraduationCap,
  TrendingUp,
  ShieldAlert,
  Briefcase,
  Heart,
  Star,
  AlertTriangle,
  FileWarning,
  ArrowRight,
  Activity,
  X,
  UserX,
} from "lucide-react";
import type { AdminDashboardPayload } from "@/lib/admin-dashboard-data";
import { EVENT_TYPE_LABELS } from "@/lib/sanctions-ui";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

const DISMISSED_ALERTS_KEY = "skilla_dismissed_alerts";

function getDismissedAlerts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function dismissAlert(id: string) {
  const current = getDismissedAlerts();
  if (!current.includes(id)) {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...current, id]));
  }
}

function resetDismissedAlerts() {
  localStorage.removeItem(DISMISSED_ALERTS_KEY);
}

type Props = { payload: AdminDashboardPayload };

function KpiCard({
  label,
  value,
  sub,
  color = "text-slate-900",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition h-full">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`mt-2 text-2xl font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{sub}</p>}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block group">
        {inner}
        <span className="sr-only">Voir détail</span>
      </Link>
    );
  }
  return inner;
}

export default function AdminDashboardClient({ payload }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { filterOptions, alerts, kpis, charts, miniTables, qualiopi, schoolName, qualiopiEnabled, monthlyLoginsByRole } = payload;

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedIds(getDismissedAlerts());
  }, []);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));

  const handleDismiss = useCallback(
    (id: string) => {
      dismissAlert(id);
      setDismissedIds((prev) => [...prev, id]);
    },
    [],
  );

  const handleResetAlerts = useCallback(() => {
    resetDismissedAlerts();
    setDismissedIds([]);
  }, []);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams();
    const semester = filterOptions.selectedSemesterId ?? "";
    const cls = filterOptions.selectedClassId ?? "";
    const period = filterOptions.selectedPeriod;
    if (key === "semester") params.set("semester", value);
    else if (semester) params.set("semester", semester);
    if (key === "class") {
      if (value) params.set("class", value);
    } else if (cls) params.set("class", cls);
    if (key === "period") params.set("period", value);
    else params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatAvg = (n: number | null) =>
    n != null ? n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";

  return (
    <div className="flex flex-col gap-8 font-sans text-slate-900 pb-10 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <Activity className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-widest">
              Tour de Contrôle
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-12">
            {schoolName} — Vue globale de l&apos;établissement
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterOptions.selectedSemesterId ?? ""}
            onChange={(e) => updateFilters("semester", e.target.value)}
            className="px-3 py-2 text-[10px] font-black uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          >
            {filterOptions.semesters.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.schoolYear ? ` (${s.schoolYear})` : ''}</option>
            ))}
          </select>
          <select
            value={filterOptions.selectedClassId ?? ""}
            onChange={(e) => updateFilters("class", e.target.value)}
            className="px-3 py-2 text-[10px] font-black uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="">Toutes les classes</option>
            {filterOptions.classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterOptions.selectedPeriod}
            onChange={(e) => updateFilters("period", e.target.value)}
            className="px-3 py-2 text-[10px] font-black uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
            <option value="semester">Semestre</option>
          </select>
        </div>
      </header>

      {visibleAlerts.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {visibleAlerts.map((a) => (
            <div key={a.id} className={`flex items-center gap-1 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition ${SEVERITY_STYLES[a.severity]}`}>
              <Link
                href={a.href}
                className="flex items-center gap-2 px-3 py-2.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{a.count} {a.label}</span>
                <ArrowRight className="h-3 w-3 opacity-50" />
              </Link>
              <button
                onClick={() => handleDismiss(a.id)}
                className="pr-2 py-2.5 pl-0 text-current/40 hover:text-current transition"
                title="Masquer cette alerte"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </section>
      )}
      {alerts.length > visibleAlerts.length && (
        <button
          onClick={handleResetAlerts}
          className="text-[9px] font-bold text-slate-400 uppercase tracking-wider hover:text-blue-600 transition ml-1"
        >
          ↺ Afficher les {alerts.length - visibleAlerts.length} alerte(s) masquée(s)
        </button>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="Élèves actifs" value={kpis.students} sub={`${kpis.classes} classes`} href="/admin/users?role=STUDENT" />
        <KpiCard label="Professeurs" value={kpis.teachers} href="/admin/users?role=TEACHER" />
        <KpiCard label="Assiduité réglem." value={`${kpis.attendanceRate}%`} sub="Présents + Excusés" color={kpis.attendanceRate >= 90 ? "text-emerald-600" : kpis.attendanceRate >= 80 ? "text-amber-600" : "text-red-600"} href="/admin/absences" />
        <KpiCard label="Décrochage injustifié" value={`${kpis.unjustifiedAbsenceRate}%`} sub="Absences non justifiées" color={kpis.unjustifiedAbsenceRate <= 5 ? "text-emerald-600" : kpis.unjustifiedAbsenceRate <= 10 ? "text-amber-600" : "text-red-600"} href="/admin/absences?status=UNCONFIRMED" />
        <KpiCard label="À justifier (<48h)" value={kpis.pendingJustifications} sub="En attente justificatif" color="text-sky-600" href="/admin/absences?status=UNCONFIRMED" />
        <KpiCard label="Hors délai (>48h)" value={kpis.overdueAbsences} sub="À relancer / sanctionner" color={kpis.overdueAbsences > 0 ? "text-red-600" : "text-slate-400"} href="/admin/absences?status=UNCONFIRMED" />
        <KpiCard label="Moyenne générale" value={formatAvg(kpis.generalAverage)} color="text-blue-600" href="/admin/report-cards" />
        <KpiCard label="Dispersion notes" value={kpis.gradeStdDev != null ? `±${kpis.gradeStdDev}` : "—"} sub="Écart-type / 20" color="text-indigo-600" href="/admin/report-cards" />
        <KpiCard label="Complétude notes" value={`${kpis.gradeCompletionPct}%`} sub="Matières ≥ 2 notes" color={kpis.gradeCompletionPct >= 80 ? "text-emerald-600" : "text-amber-600"} href="/admin/report-cards" />
        <KpiCard label="Bulletins validés" value={`${kpis.reportCardsPct}%`} href="/admin/recap/report-cards" />
        <KpiCard label="Compétences acquises" value={`${kpis.competencyAcquiredPct}%`} href="/admin/recap/competencies" />
        <KpiCard label="Sanctions (période)" value={kpis.sanctionsCount} color="text-red-600" href="/admin/sanctions" />
        <KpiCard label="Heures réalisées" value={`${kpis.hrHoursRealized}h`} sub={`/ ${kpis.hrHoursProjected}h projetées`} href="/admin/hr" />
        <KpiCard label="Contrats actifs" value={`${kpis.contractCoveragePct}%`} href="/admin/relations/contracts" />
        <KpiCard label="Parents liés" value={`${kpis.parentLinkPct}%`} href="/admin/recap" />
        <KpiCard label="Activation parents" value={`${kpis.parentActivationPct}%`} sub="Comptes connectés" color={kpis.parentActivationPct >= 70 ? "text-emerald-600" : "text-amber-600"} href="/admin/recap" />
        <KpiCard label="Présence profs" value={`${kpis.teacherAttendanceRate}%`} color={kpis.teacherAttendanceRate >= 95 ? "text-emerald-600" : kpis.teacherAttendanceRate >= 85 ? "text-amber-600" : "text-red-600"} href="/admin/absences" />
        <KpiCard label="Émargements à temps" value={`${kpis.rollCallValidationRate}%`} sub="Appels validés" color={kpis.rollCallValidationRate >= 90 ? "text-emerald-600" : "text-amber-600"} href="/admin/absences" />
        <KpiCard label="Occupation salles" value={`${kpis.roomOccupancyRate}%`} sub="Heures occupées" color="text-blue-600" href="/admin/settings" />
        <KpiCard label="Appels en attente" value={kpis.pendingRollCalls} color={kpis.pendingRollCalls > 0 ? "text-amber-600" : "text-emerald-600"} href="/admin/absences" />
        {qualiopiEnabled && (
          <>
            <KpiCard label="Satisfaction" value={kpis.satisfactionAvg != null ? `${kpis.satisfactionAvg}/5` : "—"} color="text-violet-600" href="/admin/qualiopi" />
            <KpiCard label="Réclamations ouvertes" value={kpis.openComplaints} color={kpis.openComplaints > 0 ? "text-amber-600" : "text-emerald-600"} href="/admin/qualiopi" />
          </>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Évolution assiduité & décrochage (12 sem.)
            </h2>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Assiduité réglem.
              </span>
              <span className="flex items-center gap-1.5 text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Injustifié
              </span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.attendanceWeekly} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                  formatter={(v: any, name: any) => [
                    `${v}%`,
                    name === "rate" ? "Assiduité réglem. (Présents + Excusés)" : "Absentéisme injustifié (décrochage)"
                  ]}
                />
                <Line type="monotone" dataKey="rate" name="rate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981" }} />
                <Line type="monotone" dataKey="unjustifiedRate" name="unjustifiedRate" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2.5, fill: "#ef4444" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            Moyennes par classe
          </h2>
          <div className="h-56">
            {charts.classAverages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">Aucune note</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.classAverages} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 20]} stroke="#94a3b8" fontSize={9} />
                  <YAxis type="category" dataKey="className" stroke="#94a3b8" fontSize={9} width={70} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} />
                  <Bar dataKey="average" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            Sanctions par type
          </h2>
          <div className="h-56">
            {charts.sanctionsByType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">Aucune sanction</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.sanctionsByType} margin={{ top: 5, right: 10, bottom: 40, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="type" stroke="#94a3b8" fontSize={8} angle={-25} textAnchor="end" height={50} />
                  <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            Heures RH (12 sem.) — planifiées vs réalisées
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.hrHoursWeekly} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={8} />
                <YAxis stroke="#94a3b8" fontSize={9} unit="h" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="planned" name="Planifiées" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realized" name="Réalisées" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Teacher Workload Chart */}
      <section>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Charge de travail des professeurs (année) — Réalisé vs Prévu
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Taux de réalisation des heures d&apos;enseignement effectuées sur le volume annuel prévisionnel
              </p>
            </div>
            {charts.teacherWorkloadByTeacher.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Réalisation moyenne :
                </span>
                <span className="text-xs font-black text-blue-700">
                  {Math.round(
                    charts.teacherWorkloadByTeacher.reduce((acc, t) => acc + (t.percentage ?? 0), 0) /
                      charts.teacherWorkloadByTeacher.length,
                  )}
                  %
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              height: Math.max(260, charts.teacherWorkloadByTeacher.length * 44),
            }}
          >
            {charts.teacherWorkloadByTeacher.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                Aucune donnée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.teacherWorkloadByTeacher}
                  layout="vertical"
                  margin={{ top: 5, right: 45, bottom: 5, left: 140 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} unit="h" />
                  <YAxis
                    type="category"
                    dataKey="teacherName"
                    stroke="#94a3b8"
                    fontSize={10}
                    width={130}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                      const item = charts.teacherWorkloadByTeacher.find(
                        (t) => t.teacherName === payload.value,
                      );
                      const pct = item?.percentage ?? 0;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={-8}
                            y={0}
                            dy={4}
                            textAnchor="end"
                            fill="#1e293b"
                            fontSize={10}
                            fontWeight={600}
                          >
                            <tspan>{payload.value}</tspan>
                            <tspan fill="#2563eb" fontWeight={800} dx={6}>
                              ({pct}%)
                            </tspan>
                          </text>
                        </g>
                      );
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as {
                        teacherName: string;
                        realized: number;
                        planned: number;
                        total: number;
                        percentage: number;
                      };
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs min-w-[220px]">
                          <p className="font-bold text-slate-100 mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                            <span>{data.teacherName}</span>
                            <span className="text-emerald-400 font-black text-sm">
                              {data.percentage}%
                            </span>
                          </p>
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center text-blue-400">
                              <span>Heures réalisées :</span>
                              <span className="font-bold">{data.realized}h</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                              <span>Heures restantes :</span>
                              <span className="font-bold">{data.planned}h</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
                              <span>Total annuel prévu :</span>
                              <span className="font-bold">{data.total}h</span>
                            </div>
                            <div className="mt-2 pt-1 border-t border-slate-800">
                              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>Taux de réalisation</span>
                                <span className="font-bold text-emerald-400">
                                  {data.percentage}% réalisé
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-400 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, data.percentage)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar
                    dataKey="realized"
                    name="Heures réalisées"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    <LabelList
                      dataKey="percentage"
                      position="right"
                      formatter={(v: any) => `${v}%`}
                      style={{ fontSize: 10, fontWeight: 800, fill: "#2563eb" }}
                    />
                  </Bar>
                  <Bar
                    dataKey="planned"
                    name="Planifiées restantes"
                    fill="#cbd5e1"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Top classes
            </h3>
            <Link href="/admin/report-cards" className="text-[9px] font-black text-blue-600 uppercase">Voir →</Link>
          </div>
          <ul className="divide-y divide-slate-50 p-2">
            {miniTables.topClasses.length === 0 ? (
              <li className="p-4 text-center text-[10px] text-slate-400 italic">Aucune donnée</li>
            ) : miniTables.topClasses.map((c, i) => (
              <li key={c.classId} className="flex justify-between items-center px-3 py-2.5 text-xs">
                <span className="font-bold text-slate-700"><span className="text-slate-400 mr-2">#{i + 1}</span>{c.className}</span>
                <span className="font-black text-blue-600">{c.average}/20</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <FileWarning className="h-3.5 w-3.5 text-amber-500" /> Classes à surveiller
            </h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Injustifié &gt; 10%</span>
          </div>
          <ul className="divide-y divide-slate-50 p-2">
            {miniTables.atRiskClasses.length === 0 ? (
              <li className="p-4 text-center text-[10px] text-emerald-600 font-bold uppercase">Tout va bien ✓</li>
            ) : miniTables.atRiskClasses.map((c) => (
              <li key={c.classId} className="px-3 py-2.5 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>{c.className}</span>
                  {c.unjustifiedRate > 0 && (
                    <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                      {c.unjustifiedRate}% injustifié
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                  <span>Assid. réglem. {c.attendanceRate}%</span>
                  {c.average != null && <span>Moy. {c.average}/20</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-violet-500" /> Compétences faibles
            </h3>
            <Link href="/admin/recap/competencies" className="text-[9px] font-black text-blue-600 uppercase">Voir →</Link>
          </div>
          <ul className="divide-y divide-slate-50 p-2">
            {miniTables.weakCompetencies.length === 0 ? (
              <li className="p-4 text-center text-[10px] text-emerald-600 font-bold uppercase">Bon niveau global ✓</li>
            ) : miniTables.weakCompetencies.map((c) => (
              <li key={c.name} className="flex justify-between items-center px-3 py-2.5 text-xs">
                <span className="font-medium text-slate-700 truncate max-w-[60%]">{c.name}</span>
                <span className="font-black text-amber-600">{c.acquiredPct}% acquis</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <UserX className="h-3.5 w-3.5 text-red-500" /> Veille Décrochage (Élèves)
            </h3>
            <Link href="/admin/absences?status=UNCONFIRMED" className="text-[9px] font-black text-blue-600 uppercase">Gérer →</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {miniTables.atRiskStudents.length === 0 ? (
              <li className="p-6 text-center text-[10px] text-emerald-600 font-bold uppercase">Aucun décrochage critique ✓</li>
            ) : miniTables.atRiskStudents.map((s) => (
              <li key={s.id} className="px-5 py-3 text-xs flex justify-between items-center">
                <div>
                  <p className="font-black text-slate-800">{s.studentName}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{s.className}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block">
                    {s.unjustifiedCount} injustifiée(s)
                  </span>
                  <p className={`text-[9px] font-bold mt-0.5 ${s.conductPoints <= 50 ? "text-red-600 font-black" : "text-slate-400"}`}>
                    {s.conductPoints} pts conduite
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Événements discipline
            </h3>
            <Link href="/admin/sanctions" className="text-[9px] font-black text-blue-600 uppercase">Voir →</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {miniTables.recentDisciplineEvents.length === 0 ? (
              <li className="p-6 text-center text-[10px] text-slate-400 italic">Aucun événement</li>
            ) : miniTables.recentDisciplineEvents.map((e) => (
              <li key={e.id} className="px-5 py-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-black text-slate-800">{e.studentName}</span>
                  <span className="text-[9px] font-bold text-slate-400">{new Date(e.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <p className="text-[10px] text-red-600 font-black uppercase mt-0.5">{EVENT_TYPE_LABELS[e.type] ?? e.type}</p>
                <p className="text-slate-600 mt-0.5 line-clamp-1">{e.description}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-teal-500" /> Contrats à renouveler
            </h3>
            <Link href="/admin/relations/contracts" className="text-[9px] font-black text-blue-600 uppercase">Voir →</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {miniTables.expiringContracts.length === 0 ? (
              <li className="p-6 text-center text-[10px] text-emerald-600 font-bold uppercase">Aucun contrat imminent ✓</li>
            ) : miniTables.expiringContracts.map((c) => (
              <li key={c.id} className="flex justify-between items-center px-5 py-3 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{c.studentName}</p>
                  <p className="text-[10px] text-slate-500">{c.companyName}</p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${c.daysLeft <= 30 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  J-{c.daysLeft}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section : Connexions mensuelles actives par profil (30 derniers jours) */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Connexions mensuelles actives par profil (30 derniers jours)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pourcentage d&apos;utilisateurs s&apos;étant connectés au moins une fois ce mois-ci par catégorie
            </p>
          </div>
          <Link
            href="/admin/users"
            className="text-[9px] font-black text-blue-600 uppercase tracking-wider hover:underline self-start sm:self-auto"
          >
            Annuaire usagers →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {monthlyLoginsByRole.map((item) => {
            const isHigh = item.percentage >= 80;
            const isMedium = item.percentage >= 50;
            const barColor = isHigh ? "bg-emerald-500" : isMedium ? "bg-amber-500" : "bg-red-500";
            const textColor = isHigh ? "text-emerald-700" : isMedium ? "text-amber-700" : "text-red-700";
            const badgeBg = isHigh ? "bg-emerald-50 border-emerald-100" : isMedium ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";

            return (
              <div
                key={item.role}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 flex flex-col justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider truncate">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeBg} ${textColor}`}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold">
                    <span className="text-slate-900 font-black">{item.activeMonthly}</span> / {item.total} actifs
                  </p>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {qualiopiEnabled && (
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Heart className="h-3.5 w-3.5 text-violet-500" /> Qualiopi — Satisfaction & Réclamations
          </h3>
          <Link href="/admin/qualiopi" className="text-[9px] font-black text-blue-600 uppercase">Gérer →</Link>
        </div>
        <div className="grid lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          <div className="p-6 flex flex-col items-center justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note moyenne</p>
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
              <span className="text-4xl font-black text-slate-900">
                {qualiopi.satisfactionAvg != null ? qualiopi.satisfactionAvg.toFixed(1) : "—"}
              </span>
              <span className="text-sm text-slate-400 font-bold">/5</span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold mt-2">{qualiopi.satisfactionCount} réponses</p>
            <div className="h-32 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={qualiopi.ratingDistribution.filter((r) => r.count > 0)} dataKey="count" nameKey="rating" cx="50%" cy="50%" outerRadius={50}>
                    {qualiopi.ratingDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} formatter={(value, name) => [`${value} réponses`, `${name} ★`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-6 lg:col-span-2">
            <div className="flex gap-4 mb-4">
              <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[9px] font-black text-amber-600 uppercase">Ouvertes</p>
                <p className="text-xl font-black text-amber-700">{qualiopi.openComplaints}</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-600 uppercase">Traitées</p>
                <p className="text-xl font-black text-emerald-700">{qualiopi.closedComplaints}</p>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dernières réclamations</p>
            <ul className="space-y-2">
              {qualiopi.recentComplaints.length === 0 ? (
                <li className="text-[10px] text-slate-400 italic">Aucune réclamation</li>
              ) : qualiopi.recentComplaints.map((c) => (
                <li key={c.id} className="flex justify-between items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{c.subject}</p>
                    <p className="text-[10px] text-slate-500">{c.senderName} · {new Date(c.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${c.status === "OPEN" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", label: "Utilisateurs", icon: Users },
          { href: "/admin/planning", label: "Planning", icon: Activity },
          { href: "/admin/hr", label: "RH", icon: Briefcase },
          { href: "/admin", label: "Hub Admin", icon: ArrowRight },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition text-xs font-black uppercase tracking-wider text-slate-700">
            <item.icon className="h-4 w-4 text-slate-400" />
            {item.label}
          </Link>
        ))}
      </section>
    </div>
  );
}
