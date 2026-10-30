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
  Star,
  AlertTriangle,
  FileWarning,
  ArrowRight,
  Activity,
  X,
  UserX,
  Building2,
  BookOpen,
  BookMarked,
  CheckCircle2,
  Layers,
  Check,
  Award,
} from "lucide-react";
import type { AdminDashboardPayload } from "@/lib/admin-dashboard-data";
import { EVENT_TYPE_LABELS } from "@/lib/sanctions-ui";

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

function KpiBox({
  label,
  value,
  sub,
  color = "text-slate-900",
  href,
  badge,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  href?: string;
  badge?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:shadow transition h-full flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{label}</p>
          {badge && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className={`text-2xl font-black tabular-nums tracking-tight ${color}`}>{value}</p>
      </div>
      {sub && <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tight truncate">{sub}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}

export default function AdminDashboardClient({ payload }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    filterOptions,
    alerts,
    kpis,
    charts,
    miniTables,
    qualiopi,
    schoolName,
    qualiopiEnabled,
    monthlyLoginsByRole,
  } = payload;

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedIds(getDismissedAlerts());
  }, []);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));

  const handleDismiss = useCallback((id: string) => {
    dismissAlert(id);
    setDismissedIds((prev) => [...prev, id]);
  }, []);

  const handleResetAlerts = useCallback(() => {
    resetDismissedAlerts();
    setDismissedIds([]);
  }, []);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams();
    const semester = filterOptions.selectedSemesterId ?? "";
    const cls = filterOptions.selectedClassId ?? "";
    if (key === "semester") params.set("semester", value);
    else if (semester) params.set("semester", semester);
    if (key === "class") {
      if (value) params.set("class", value);
    } else if (cls) params.set("class", cls);
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatAvg = (n: number | null) =>
    n != null ? n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";

  return (
    <div className="flex flex-col gap-10 font-sans text-slate-900 pb-16 animate-in fade-in duration-500">
      {/* Top Header & Filters */}
      <header className="flex flex-col lg:flex-row justify-between items-start gap-6 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase tracking-widest">
                Tour de Contrôle
              </h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {schoolName} — Pilotage Stratégique & Pédagogique
              </p>
            </div>
          </div>
        </div>

        {/* Global Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterOptions.selectedSemesterId ?? ""}
            onChange={(e) => updateFilters("semester", e.target.value)}
            className="px-3.5 py-2.5 text-xs font-black uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {filterOptions.semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.schoolYear ? ` (${s.schoolYear})` : ""}
              </option>
            ))}
          </select>
          <select
            value={filterOptions.selectedClassId ?? ""}
            onChange={(e) => updateFilters("class", e.target.value)}
            className="px-3.5 py-2.5 text-xs font-black uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">Toutes les classes</option>
            {filterOptions.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Navigation Pills (Ancres thématiques) */}
      <nav className="flex flex-wrap items-center gap-2 -mt-4">
        <a
          href="#pedagogie-section"
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200 flex items-center gap-1.5"
        >
          <GraduationCap className="w-3.5 h-3.5" /> Pédagogie & Devoirs
        </a>
        <a
          href="#vie-scolaire-section"
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200 flex items-center gap-1.5"
        >
          <Activity className="w-3.5 h-3.5" /> Vie Scolaire & Climat
        </a>
        <a
          href="#salles-section"
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition border border-cyan-200 flex items-center gap-1.5"
        >
          <Building2 className="w-3.5 h-3.5" /> Salles & Logistique
        </a>
        <a
          href="#rh-section"
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 hover:bg-purple-100 transition border border-purple-200 flex items-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> Formateurs & RH
        </a>
        <a
          href="#relations-section"
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200 flex items-center gap-1.5"
        >
          <Briefcase className="w-3.5 h-3.5" /> Alternance & Familles
        </a>
        {qualiopiEnabled && (
          <a
            href="#qualiopi-section"
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200 flex items-center gap-1.5"
          >
            <Star className="w-3.5 h-3.5" /> Qualiopi
          </a>
        )}
      </nav>

      {/* Encadré Thématique des Alertes & Vigilances */}
      <section className="bg-white rounded-3xl border-2 border-amber-200/90 shadow-sm p-5 sm:p-6 transition relative overflow-hidden flex flex-col gap-4">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Centre de Vigilances & Alertes Opérationnelles
                </h2>
                {visibleAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                    {visibleAlerts.length} active{visibleAlerts.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Points de contrôle prioritaires requérant une action ou une relance administrative
              </p>
            </div>
          </div>

          {alerts.length > visibleAlerts.length && (
            <button
              onClick={handleResetAlerts}
              className="px-3 py-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider hover:text-blue-600 transition bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto shadow-sm"
            >
              ↺ Réafficher ({alerts.length - visibleAlerts.length} masquée{alerts.length - visibleAlerts.length > 1 ? "s" : ""})
            </button>
          )}
        </div>

        {visibleAlerts.length === 0 ? (
          <div className="flex items-center gap-3 py-3 px-4 text-emerald-800 bg-emerald-50/70 rounded-2xl border border-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Toutes les opérations sont nominales</p>
              <p className="text-[11px] text-emerald-700 font-medium">Aucune anomalie ou retard critique n&apos;a été détecté pour le moment.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {visibleAlerts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-1.5 rounded-2xl border text-[11px] font-black uppercase tracking-wider transition shadow-sm hover:shadow ${SEVERITY_STYLES[a.severity]}`}
              >
                <Link href={a.href} className="flex items-center gap-2 px-3.5 py-2.5">
                  <span className="h-2 w-2 rounded-full bg-current shrink-0 animate-pulse" />
                  <span>
                    {a.count} {a.label}
                  </span>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>
                <button
                  onClick={() => handleDismiss(a.id)}
                  className="pr-2.5 py-2.5 pl-0 text-current/50 hover:text-current transition"
                  title="Masquer cette alerte"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 1. CATÉGORIE : PÉDAGOGIE, ÉVALUATIONS & CAHIER DE TEXTE                   */}
      {/* ========================================================================= */}
      <section
        id="pedagogie-section"
        className="rounded-3xl border-2 border-blue-100 bg-white p-6 sm:p-7 shadow-sm flex flex-col gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />
        
        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-slate-900">
                1. Pédagogie, Évaluations & Cahier de Texte
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Moyennes académiques, complétude des notes, livrets et suivi des contenus dispensés
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/notes"
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
            >
              Dernières notes →
            </Link>
            <Link
              href="/admin/devoirs"
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              Devoirs & Contenus →
            </Link>
          </div>
        </div>

        {/* 1A. Chiffres clés KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiBox
            label="Moyenne générale"
            value={formatAvg(kpis.generalAverage)}
            color="text-blue-600"
            sub="Barème / 20"
            href="/admin/report-cards"
          />
          <KpiBox
            label="Dispersion / Écart-type"
            value={kpis.gradeStdDev != null ? `±${kpis.gradeStdDev}` : "—"}
            color="text-indigo-600"
            sub="Écart moyen / 20"
            href="/admin/report-cards"
          />
          <KpiBox
            label="Complétude notes"
            value={`${kpis.gradeCompletionPct}%`}
            color={kpis.gradeCompletionPct >= 80 ? "text-emerald-600" : "text-amber-600"}
            sub="Matières ≥ 2 notes"
            href="/admin/report-cards"
          />
          <KpiBox
            label="Cahier de texte"
            value={`${kpis.courseContentFillRate}%`}
            color={kpis.courseContentFillRate >= 80 ? "text-emerald-600" : "text-amber-600"}
            sub={kpis.missingContentCount > 0 ? `${kpis.missingContentCount} sans contenu` : "100% à jour"}
            href="/admin/devoirs?tab=missing"
          />
          <KpiBox
            label="Bulletins validés"
            value={`${kpis.reportCardsPct}%`}
            color="text-slate-800"
            sub="Conseils de classe"
            href="/admin/recap/report-cards"
          />
          <KpiBox
            label="Compétences"
            value={`${kpis.competencyAcquiredPct}%`}
            color="text-violet-600"
            sub="Taux d'acquisition"
            href="/admin/recap/competencies"
          />
        </div>

        {/* 1B. Graphiques associés (Courbes, Camembert, Barres) */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Courbe : Remplissage du cahier de texte (12 sem.) */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Remplissage du cahier de texte (12 sem.)
                </span>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {kpis.courseContentFillRate}% global
                </span>
              </div>
              <div className="h-48">
                {charts.courseContentWeekly?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucune donnée
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.courseContentWeekly} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="week" stroke="#94a3b8" fontSize={8} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={8} tickLine={false} unit="%" />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                        formatter={(v: any, _name: any, item: any) => [
                          `${v}% (${item?.payload?.withContent} / ${item?.payload?.totalLessons} cours)`,
                          "Complétude",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="fillRate"
                        name="Taux de remplissage"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>{kpis.totalPastLessonsCount - kpis.missingContentCount} séances rédigées</span>
              <Link href="/admin/devoirs" className="text-blue-600 font-bold hover:underline">
                Superviser →
              </Link>
            </div>
          </div>

          {/* Camembert / Donut : Répartition des notes par tranches */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  Répartition des notes par tranche
                </span>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {formatAvg(kpis.generalAverage)}/20
                </span>
              </div>
              <div className="h-48">
                {charts.gradeDistribution?.every((d) => d.count === 0) ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucune note émise
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.gradeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="label"
                      >
                        {charts.gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val} note(s) (${item?.payload?.percentage}%)`,
                          item?.payload?.label,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {/* Legend pills */}
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200 text-[9px] font-bold">
              {charts.gradeDistribution?.map((d) => (
                <div key={d.bracket} className="flex items-center gap-1 text-slate-600 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.bracket} ({d.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* BarChart : Moyennes par classe */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  Moyennes par classe
                </span>
                <Link href="/admin/report-cards" className="text-[9px] font-black text-blue-600 uppercase">
                  Bulletins →
                </Link>
              </div>
              <div className="h-48">
                {charts.classAverages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucune note
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.classAverages}
                      layout="vertical"
                      margin={{ top: 5, right: 15, bottom: 5, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" domain={[0, 20]} stroke="#94a3b8" fontSize={8} />
                      <YAxis
                        type="category"
                        dataKey="className"
                        stroke="#94a3b8"
                        fontSize={9}
                        width={65}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} />
                      <Bar dataKey="average" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>{charts.classAverages.length} classes évaluées</span>
              <span className="font-bold text-blue-600">Barème officiel / 20</span>
            </div>
          </div>
        </div>

        {/* 1C. Tableaux Pédagogiques (Top classes, Compétences fragiles, Cours à compléter) */}
        <div className="grid gap-4 lg:grid-cols-3 pt-2">
          {/* Top classes */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-emerald-500" /> Top classes académiques
              </span>
              <span className="text-[9px] font-bold text-slate-400">Classement</span>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {miniTables.topClasses.length === 0 ? (
                <li className="py-2 text-center text-slate-400 italic text-[10px]">Aucune donnée</li>
              ) : (
                miniTables.topClasses.slice(0, 4).map((c, i) => (
                  <li key={c.classId} className="py-1.5 flex justify-between items-center">
                    <span className="font-bold text-slate-700">
                      <span className="text-slate-400 mr-1.5">#{i + 1}</span> {c.className}
                    </span>
                    <span className="font-black text-blue-600">{c.average}/20</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Compétences faibles */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileWarning className="h-3.5 w-3.5 text-amber-500" /> Compétences à consolider
              </span>
              <Link href="/admin/recap/competencies" className="text-[9px] font-bold text-blue-600">Détail →</Link>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {miniTables.weakCompetencies.length === 0 ? (
                <li className="py-2 text-center text-emerald-600 font-bold text-[10px]">Toutes acquises ✓</li>
              ) : (
                miniTables.weakCompetencies.slice(0, 4).map((c) => (
                  <li key={c.name} className="py-1.5 flex justify-between items-center">
                    <span className="font-medium text-slate-700 truncate max-w-[65%]">{c.name}</span>
                    <span className="font-black text-amber-600">{c.acquiredPct}%</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Formateurs avec cours sans contenu */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" /> Relance Cahier de texte
              </span>
              <Link href="/admin/devoirs?tab=missing" className="text-[9px] font-bold text-blue-600">Relancer →</Link>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {miniTables.teachersMissingContent?.length === 0 ? (
                <li className="py-2 text-center text-emerald-600 font-bold text-[10px]">Cahier de texte 100% à jour ✓</li>
              ) : (
                miniTables.teachersMissingContent.slice(0, 4).map((t) => (
                  <li key={t.teacherId} className="py-1.5 flex justify-between items-center">
                    <span className="font-bold text-slate-700 truncate max-w-[65%]">{t.teacherName}</span>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {t.missingCount} cours manquants
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CATÉGORIE : VIE SCOLAIRE, ASSIDUITÉ & CLIMAT SCOLAIRE                  */}
      {/* ========================================================================= */}
      <section
        id="vie-scolaire-section"
        className="rounded-3xl border-2 border-emerald-100 bg-white p-6 sm:p-7 shadow-sm flex flex-col gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-slate-900">
                2. Vie Scolaire, Assiduité & Climat
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Taux de présence, prévention du décrochage, appels d&apos;émargement et discipline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/absences"
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              Émargements & Absences →
            </Link>
            <Link
              href="/admin/sanctions"
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              Discipline & Sanctions →
            </Link>
          </div>
        </div>

        {/* 2A. Chiffres clés KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiBox
            label="Assiduité réglem."
            value={`${kpis.attendanceRate}%`}
            color={kpis.attendanceRate >= 90 ? "text-emerald-600" : kpis.attendanceRate >= 80 ? "text-amber-600" : "text-red-600"}
            sub="Présents + Excusés"
            href="/admin/absences"
          />
          <KpiBox
            label="Décrochage injustifié"
            value={`${kpis.unjustifiedAbsenceRate}%`}
            color={kpis.unjustifiedAbsenceRate <= 5 ? "text-emerald-600" : kpis.unjustifiedAbsenceRate <= 10 ? "text-amber-600" : "text-red-600"}
            sub="Absences non justifiées"
            href="/admin/absences?status=UNCONFIRMED"
          />
          <KpiBox
            label="À justifier (<48h)"
            value={kpis.pendingJustifications}
            color="text-sky-600"
            sub="Délai régularisation"
            href="/admin/absences?status=UNCONFIRMED"
          />
          <KpiBox
            label="Hors délai (>48h)"
            value={kpis.overdueAbsences}
            color={kpis.overdueAbsences > 0 ? "text-red-600" : "text-slate-400"}
            sub="À relancer / sanctionner"
            href="/admin/absences?status=UNCONFIRMED"
          />
          <KpiBox
            label="Émargements validés"
            value={`${kpis.rollCallValidationRate}%`}
            color={kpis.rollCallValidationRate >= 90 ? "text-emerald-600" : "text-amber-600"}
            sub="Appels formateurs"
            href="/admin/absences"
          />
          <KpiBox
            label="Sanctions période"
            value={kpis.sanctionsCount}
            color="text-red-600"
            sub={kpis.pendingRollCalls > 0 ? `${kpis.pendingRollCalls} appels en attente` : "Discipline"}
            href="/admin/sanctions"
          />
        </div>

        {/* 2B. Graphiques associés (Courbe assiduité, Camembert présences, Barres sanctions) */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Courbe : Évolution assiduité & décrochage */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  Assiduité vs Décrochage (12 sem.)
                </span>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {kpis.attendanceRate}% assiduité
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.attendanceWeekly} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="week" stroke="#94a3b8" fontSize={8} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={8} tickLine={false} unit="%" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                      formatter={(v: any, name: any) => [
                        `${v}%`,
                        name === "rate" ? "Assiduité réglem." : "Absentéisme injustifié",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="rate"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: "#10b981" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="unjustifiedRate"
                      name="unjustifiedRate"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: "#ef4444" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[9px] font-bold text-slate-500 flex justify-between">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Présents + Excusés
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Décrochage
              </span>
            </div>
          </div>

          {/* Camembert / Donut : Répartition globale de l'assiduité */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  Répartition des statuts de présence
                </span>
                <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  Période
                </span>
              </div>
              <div className="h-48">
                {charts.attendanceDistribution?.every((d) => d.count === 0) ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucun émargement
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.attendanceDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="name"
                      >
                        {charts.attendanceDistribution.map((entry, index) => (
                          <Cell key={`cell-att-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val} créneau(x) (${item?.payload?.percentage}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {/* Legend pills */}
            <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-200 text-[9px] font-bold">
              {charts.attendanceDistribution?.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-slate-600 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name} : {d.percentage}% ({d.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* BarChart : Sanctions par type */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  Sanctions par nature
                </span>
                <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  {kpis.sanctionsCount} total
                </span>
              </div>
              <div className="h-48">
                {charts.sanctionsByType.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucune sanction enregistrée
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.sanctionsByType} margin={{ top: 5, right: 10, bottom: 30, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="type" stroke="#94a3b8" fontSize={8} angle={-20} textAnchor="end" height={35} />
                      <YAxis stroke="#94a3b8" fontSize={8} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} />
                      <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>{charts.sanctionsByType.length} types appliqués</span>
              <Link href="/admin/sanctions" className="text-red-600 font-bold hover:underline">
                Gérer sanctions →
              </Link>
            </div>
          </div>
        </div>

        {/* 2C. Tableaux Vie Scolaire (Classes à surveiller, Élèves décrochage, Événements) */}
        <div className="grid gap-4 lg:grid-cols-3 pt-2">
          {/* Classes à surveiller */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileWarning className="h-3.5 w-3.5 text-amber-500" /> Classes à surveiller
              </span>
              <span className="text-[9px] font-bold text-slate-400">Injustifié &gt; 10%</span>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {miniTables.atRiskClasses.length === 0 ? (
                <li className="py-2 text-center text-emerald-600 font-bold text-[10px]">Toutes assidues ✓</li>
              ) : (
                miniTables.atRiskClasses.slice(0, 5).map((c) => (
                  <li key={c.classId} className="py-1.5">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>{c.className}</span>
                      <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                        {c.unjustifiedRate}% injustifié
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                      <span>Assiduité : {c.attendanceRate}%</span>
                      {c.average != null && <span>Moy : {c.average}/20</span>}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Veille Décrochage Élèves (Affiche au moins 5 élèves) */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <UserX className="h-3.5 w-3.5 text-red-500" /> Veille Décrochage Élèves
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full">
                  Top {Math.min(5, miniTables.atRiskStudents.length)}
                </span>
                <Link href="/admin/absences?status=UNCONFIRMED" className="text-[9px] font-bold text-blue-600 hover:underline">
                  Action →
                </Link>
              </div>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {miniTables.atRiskStudents.length === 0 ? (
                <li className="py-2 text-center text-emerald-600 font-bold text-[10px]">Aucun décrochage critique ✓</li>
              ) : (
                miniTables.atRiskStudents.slice(0, 5).map((s, idx) => (
                  <li key={s.id} className="py-1.5 flex justify-between items-center hover:bg-slate-100/50 px-1 rounded-lg transition">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-slate-400 w-3 shrink-0">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{s.studentName}</p>
                        <p className="text-[9px] text-slate-400">{s.className}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        {s.unjustifiedCount} abs.
                      </span>
                      <span className={`text-[8px] font-bold ${s.conductPoints <= 50 ? "text-red-600 font-black" : "text-slate-400"}`}>
                        {s.conductPoints} pts
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Événements discipline */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Événements récents
              </span>
              <Link href="/admin/sanctions" className="text-[9px] font-bold text-blue-600 hover:underline">Sanctions →</Link>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {miniTables.recentDisciplineEvents.length === 0 ? (
                <li className="py-2 text-center text-slate-400 italic text-[10px]">Aucun incident récent ✓</li>
              ) : (
                miniTables.recentDisciplineEvents.slice(0, 5).map((e) => (
                  <li key={e.id} className="py-1.5">
                    <div className="flex justify-between text-slate-800 font-bold">
                      <span>{e.studentName}</span>
                      <span className="text-[8px] text-red-600 uppercase">{EVENT_TYPE_LABELS[e.type] ?? e.type}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{e.description}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CATÉGORIE : INFRASTRUCTURES, SALLES & LOGISTIQUE                      */}
      {/* ========================================================================= */}
      <section
        id="salles-section"
        className="rounded-3xl border-2 border-cyan-100 bg-white p-6 sm:p-7 shadow-sm flex flex-col gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-slate-900">
                3. Infrastructures & Occupation des Salles
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Taux de charge horaire et optimisation de l&apos;accueil des classes sur la période
              </p>
            </div>
          </div>
          <Link
            href="/admin/rooms"
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition self-start sm:self-auto"
          >
            Gestion des Salles →
          </Link>
        </div>

        {/* 3A. Chiffres clés KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiBox
            label="Occupation globale"
            value={`${kpis.roomOccupancyRate}%`}
            color={kpis.roomOccupancyRate >= 80 ? "text-amber-600" : kpis.roomOccupancyRate >= 40 ? "text-blue-600" : "text-slate-600"}
            sub="Base 45h/sem."
            href="/admin/rooms"
          />
          <KpiBox
            label="Heures occupées"
            value={`${kpis.totalOccupiedRoomHours}h`}
            color="text-slate-800"
            sub="Cours réalisés"
            href="/admin/rooms"
          />
          <KpiBox
            label="Capacité disponible"
            value={`${kpis.totalAvailableRoomHours}h`}
            color="text-slate-800"
            sub="Sur la période"
            href="/admin/rooms"
          />
          <KpiBox
            label="Salles actives"
            value={charts.roomOccupancyByRoom?.length || 0}
            color="text-cyan-600"
            sub="Locaux déclarés"
            href="/admin/rooms"
          />
        </div>

        {/* 3B. Graphiques Salles (Barres détaillées par salle + Courbe hebdo) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Taux par salle */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" /> Taux d&apos;occupation par salle
                </span>
                <span className="text-[9px] font-bold text-slate-400">Classement</span>
              </div>
              <div style={{ height: Math.max(200, Math.min(280, (charts.roomOccupancyByRoom?.length || 0) * 34)) }}>
                {charts.roomOccupancyByRoom?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucune salle
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.roomOccupancyByRoom}
                      layout="vertical"
                      margin={{ top: 5, right: 35, bottom: 5, left: 65 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={8} unit="%" />
                      <YAxis
                        type="category"
                        dataKey="roomName"
                        stroke="#94a3b8"
                        fontSize={9}
                        width={60}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                        formatter={(v: any, _name: any, item: any) => [
                          `${v}% (${item?.payload?.occupiedHours}h / ${item?.payload?.availableHours}h)`,
                          "Occupation",
                        ]}
                      />
                      <Bar
                        dataKey="occupancyRate"
                        name="Taux"
                        fill="#06b6d4"
                        radius={[0, 4, 4, 0]}
                        barSize={12}
                      >
                        <LabelList
                          dataKey="occupancyRate"
                          position="right"
                          formatter={(v: any) => `${v}%`}
                          style={{ fontSize: 9, fontWeight: 700, fill: "#0891b2" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>{charts.roomOccupancyByRoom?.length || 0} salles analysées</span>
              <span className="font-bold text-cyan-600">Cible optimale : 50% - 80%</span>
            </div>
          </div>

          {/* Courbe hebdo d'occupation des salles */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600" /> Évolution hebdomadaire de la charge (12 sem.)
                </span>
                <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                  {kpis.totalOccupiedRoomHours}h cumulées
                </span>
              </div>
              <div className="h-52">
                {charts.roomOccupancyWeekly?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucune donnée
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.roomOccupancyWeekly} margin={{ top: 5, right: 15, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="week" stroke="#94a3b8" fontSize={8} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} unit="%" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                        formatter={(v: any, _name: any, item: any) => [
                          `${v}% (${item?.payload?.occupiedHours}h de cours)`,
                          "Charge des locaux",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="occupancyRate"
                        name="Taux d'occupation"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: "#06b6d4" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>Pics d&apos;occupation & semaines d&apos;alternance</span>
              <Link href="/admin/rooms" className="text-cyan-700 font-bold hover:underline">
                Configuration des salles →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CATÉGORIE : FORMATEURS & RESSOURCES HUMAINES                            */}
      {/* ========================================================================= */}
      <section
        id="rh-section"
        className="rounded-3xl border-2 border-purple-100 bg-white p-6 sm:p-7 shadow-sm flex flex-col gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />

        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-slate-900">
                4. Formateurs & Ressources Humaines
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Volumes horaires d&apos;enseignement, prévisionnel contractuel et suivi d&apos;activité
              </p>
            </div>
          </div>
          <Link
            href="/admin/hr"
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition self-start sm:self-auto"
          >
            Module RH Formateurs →
          </Link>
        </div>

        {/* 4A. Chiffres clés KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiBox
            label="Professeurs actifs"
            value={kpis.teachers}
            color="text-slate-800"
            href="/admin/users?role=TEACHER"
          />
          <KpiBox
            label="Présence profs"
            value={`${kpis.teacherAttendanceRate}%`}
            color={kpis.teacherAttendanceRate >= 95 ? "text-emerald-600" : "text-amber-600"}
            sub="Cours assurés"
            href="/admin/absences"
          />
          <KpiBox
            label="Heures réalisées"
            value={`${kpis.hrHoursRealized}h`}
            color="text-blue-600"
            sub="Cumul effectif"
            href="/admin/hr"
          />
          <KpiBox
            label="Volume projeté"
            value={`${kpis.hrHoursProjected}h`}
            color="text-slate-800"
            sub="Objectif annuel"
            href="/admin/hr"
          />
          <KpiBox
            label="Réalisation RH"
            value={`${kpis.hrRealizationRate}%`}
            color="text-purple-600"
            sub="Avancement contrat"
            href="/admin/hr"
          />
        </div>

        {/* 4B. Graphiques RH (Charge individuelle annuelle + Comparatif hebdo) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Charge de travail par professeur */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" /> Charge annuelle formateurs (Réalisé vs Prévu)
                </span>
                <span className="text-[9px] font-bold text-slate-400">Heures cumulées</span>
              </div>
              <div style={{ height: Math.max(220, Math.min(320, charts.teacherWorkloadByTeacher.length * 36)) }}>
                {charts.teacherWorkloadByTeacher.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                    Aucune donnée
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.teacherWorkloadByTeacher}
                      layout="vertical"
                      margin={{ top: 5, right: 35, bottom: 5, left: 110 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={8} unit="h" />
                      <YAxis
                        type="category"
                        dataKey="teacherName"
                        stroke="#94a3b8"
                        fontSize={9}
                        width={100}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="realized" name="Réalisées" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={11} />
                      <Bar dataKey="planned" name="Restantes" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={11} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>{charts.teacherWorkloadByTeacher.length} intervenants suivis</span>
              <Link href="/admin/hr" className="text-purple-600 font-bold hover:underline">
                Suivi détaillé RH →
              </Link>
            </div>
          </div>

          {/* Heures RH hebdomadaires planifiées vs réalisées */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            {(() => {
              const inconsistentWeeksCount = charts.hrHoursWeekly.filter((w) => w.isInconsistent).length;
              return (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-purple-600" /> Rythme d&apos;enseignement hebdo (12 sem.)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {inconsistentWeeksCount > 0 && (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {inconsistentWeeksCount} sem. en écart
                          </span>
                        )}
                        <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                          {kpis.hrHoursRealized}h assurées
                        </span>
                      </div>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.hrHoursWeekly} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="week" stroke="#94a3b8" fontSize={8} />
                          <YAxis stroke="#94a3b8" fontSize={8} unit="h" />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload || !payload.length) return null;
                              const data = payload[0].payload as (typeof charts.hrHoursWeekly)[number];
                              const isInconsistent = data.isInconsistent;
                              return (
                                <div className="bg-slate-900 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-800 space-y-1.5 min-w-[170px]">
                                  <div className="font-black text-slate-300 pb-1 border-b border-slate-800 flex items-center justify-between gap-2">
                                    <span>Semaine du {label}</span>
                                    {isInconsistent && (
                                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        ⚠️ Incohérence
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between gap-4 text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-[#cbd5e1]" />
                                      Planifiées :
                                    </span>
                                    <span className="font-bold text-slate-100">{data.planned}h</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span
                                      className={`flex items-center gap-1.5 font-bold ${
                                        isInconsistent ? "text-rose-400" : "text-indigo-400"
                                      }`}
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isInconsistent ? "bg-rose-500" : "bg-indigo-500"
                                        }`}
                                      />
                                      Réalisées :
                                    </span>
                                    <span className={`font-black ${isInconsistent ? "text-rose-400" : "text-white"}`}>
                                      {data.realized}h
                                    </span>
                                  </div>
                                  {isInconsistent && (
                                    <div className="pt-1.5 border-t border-slate-800 text-[10px] space-y-0.5">
                                      <p className="text-rose-300 font-bold">
                                        {data.inconsistencyType === "deficit"
                                          ? `Écart : -${Math.abs(data.gap)}h (sous-réalisation)`
                                          : `Écart : +${Math.abs(data.gap)}h (surplus)`}
                                      </p>
                                      {data.cancelledCount > 0 && (
                                        <p className="text-slate-400 text-[9px]">
                                          {data.cancelledCount} cours annulé{data.cancelledCount > 1 ? "s" : ""}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="planned" name="Planifiées" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="realized" name="Réalisées" radius={[3, 3, 0, 0]}>
                            {charts.hrHoursWeekly.map((entry, index) => {
                              const isDeficit = entry.isInconsistent && entry.inconsistencyType === "deficit";
                              const isSurplus = entry.isInconsistent && entry.inconsistencyType === "surplus";
                              const fill = isDeficit ? "#f43f5e" : isSurplus ? "#f59e0b" : "#6366f1";
                              const stroke = entry.isInconsistent ? (isDeficit ? "#be123c" : "#b45309") : undefined;
                              return (
                                <Cell
                                  key={`cell-realized-${index}`}
                                  fill={fill}
                                  stroke={stroke}
                                  strokeWidth={entry.isInconsistent ? 1.5 : 0}
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#cbd5e1]" /> Planifié
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#6366f1]" /> Réalisé conforme
                      </span>
                      <span className="flex items-center gap-1 font-black text-rose-600">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#f43f5e] border border-rose-600" /> Incohérence (écart)
                      </span>
                    </div>
                    <span className="font-bold text-slate-600 text-[9px] uppercase tracking-wider">
                      Détection automatique
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CATÉGORIE : ALTERNANCE, ENTREPRISES & FAMILLES                         */}
      {/* ========================================================================= */}
      <section
        id="relations-section"
        className="rounded-3xl border-2 border-amber-100 bg-white p-6 sm:p-7 shadow-sm flex flex-col gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-teal-500" />

        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-slate-900">
                5. Alternance, Entreprises & Communauté
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Contrats d&apos;apprentissage, liaison tuteurs entreprise et engagement des parents
              </p>
            </div>
          </div>
          <Link
            href="/admin/relations/contracts"
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition self-start sm:self-auto"
          >
            Contrats d&apos;alternance →
          </Link>
        </div>

        {/* 5A. Chiffres clés KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiBox
            label="Élèves inscrits"
            value={kpis.students}
            color="text-slate-900"
            sub={`${kpis.classes} classes actives`}
            href="/admin/users?role=STUDENT"
          />
          <KpiBox
            label="Contrats actifs"
            value={`${kpis.contractCoveragePct}%`}
            color="text-teal-600"
            sub="Couverture alternance"
            href="/admin/relations/contracts"
          />
          <KpiBox
            label="Parents rattachés"
            value={`${kpis.parentLinkPct}%`}
            color="text-blue-600"
            sub="Lien familial validé"
            href="/admin/recap"
          />
          <KpiBox
            label="Activation parents"
            value={`${kpis.parentActivationPct}%`}
            color={kpis.parentActivationPct >= 70 ? "text-emerald-600" : "text-amber-600"}
            sub="Comptes connectés"
            href="/admin/recap"
          />
        </div>

        {/* 5B. Graphiques & Tableaux Alternance */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Connexions mensuelles actives par rôle */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Taux d&apos;engagement mensuel par profil
                </span>
                <span className="text-[9px] font-bold text-slate-400">30 derniers jours</span>
              </div>
              <div className="space-y-2.5">
                {monthlyLoginsByRole.map((item) => {
                  const isHigh = item.percentage >= 75;
                  const isMed = item.percentage >= 45;
                  const barColor = isHigh ? "bg-emerald-500" : isMed ? "bg-blue-500" : "bg-amber-500";
                  const badgeColor = isHigh
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isMed
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <div key={item.role} className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-slate-800">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.activeMonthly}/{item.total} actifs
                          </span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-2 mt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>Mesure de l&apos;adoption de l&apos;ENT</span>
              <Link href="/admin/users" className="text-blue-600 font-bold hover:underline">
                Gérer les accès →
              </Link>
            </div>
          </div>

          {/* Contrats à échéance */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-600" /> Contrats à renouveler (&lt; 90 jours)
                </span>
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  {miniTables.expiringContracts.length} contrat(s)
                </span>
              </div>
              <ul className="divide-y divide-slate-200 text-xs">
                {miniTables.expiringContracts.length === 0 ? (
                  <li className="py-6 text-center text-emerald-600 font-bold text-[10px]">
                    Aucun contrat n&apos;expire dans les 90 jours ✓
                  </li>
                ) : (
                  miniTables.expiringContracts.slice(0, 5).map((c) => (
                    <li key={c.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{c.studentName}</p>
                        <p className="text-[10px] text-slate-400">{c.companyName}</p>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          c.daysLeft <= 30 ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        J-{c.daysLeft}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>Anticipation des ruptures & avenants</span>
              <Link href="/admin/relations/contracts" className="text-amber-700 font-bold hover:underline">
                Voir tous les contrats →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CATÉGORIE : DÉMARCHE QUALITÉ & QUALIOPI (OPTIONNELLE)                  */}
      {/* ========================================================================= */}
      {qualiopiEnabled && (
        <section
          id="qualiopi-section"
          className="rounded-3xl border-2 border-rose-100 bg-white p-6 sm:p-7 shadow-sm flex flex-col gap-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500" />

          {/* Category Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Star className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-black uppercase tracking-widest text-slate-900">
                  6. Démarche Qualité & Qualiopi
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Mesure de satisfaction des bénéficiaires, réclamations et conformité aux référentiels
                </p>
              </div>
            </div>
            <Link
              href="/admin/qualiopi"
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition self-start sm:self-auto"
            >
              Espace Qualiopi →
            </Link>
          </div>

          {/* 6A. Chiffres clés KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiBox
              label="Satisfaction globale"
              value={kpis.satisfactionAvg != null ? `${kpis.satisfactionAvg}/5` : "—"}
              color="text-rose-600"
              sub={`${qualiopi.satisfactionCount} enquêtes`}
              href="/admin/qualiopi"
            />
            <KpiBox
              label="Réclamations ouvertes"
              value={kpis.openComplaints}
              color={kpis.openComplaints > 0 ? "text-amber-600" : "text-emerald-600"}
              sub="À traiter"
              href="/admin/qualiopi"
            />
            <KpiBox
              label="Réclamations traitées"
              value={qualiopi.closedComplaints}
              color="text-slate-800"
              sub="Dossiers clos"
              href="/admin/qualiopi"
            />
            <KpiBox
              label="Audit & Preuves"
              value="Conforme"
              color="text-emerald-600"
              sub="Indicateurs Qualiopi"
              href="/admin/qualiopi"
            />
          </div>

          {/* 6B. Graphiques Qualiopi */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Camembert des notes de satisfaction */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-rose-500" /> Répartition des avis de satisfaction (1 à 5 ★)
                  </span>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    {qualiopi.satisfactionAvg ? `${qualiopi.satisfactionAvg}/5` : "—"}
                  </span>
                </div>
                <div className="h-48">
                  {qualiopi.ratingDistribution?.every((d) => d.count === 0) ? (
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                      Aucune enquête saisie
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qualiopi.ratingDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="rating"
                        >
                          <Cell fill="#ef4444" />
                          <Cell fill="#f97316" />
                          <Cell fill="#eab308" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }}
                          formatter={(v: any, _name: any, item: any) => [
                            `${v} réponse(s)`,
                            `${item?.payload?.rating} étoile(s)`,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1 pt-2 border-t border-slate-200 text-[9px] font-bold text-center">
                {qualiopi.ratingDistribution?.map((d) => (
                  <span key={d.rating} className="text-slate-600">
                    {d.rating}★ ({d.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Évolution mensuelle de la satisfaction */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-rose-500" /> Évolution mensuelle de la satisfaction
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">6 derniers mois</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.satisfactionMonthly} margin={{ top: 5, right: 15, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={8} />
                      <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={8} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        name="Note moyenne"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#f43f5e" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                <span>Indicateur Qualiopi n°30 (Recueil des appréciations)</span>
                <Link href="/admin/qualiopi" className="text-rose-600 font-bold hover:underline">
                  Rapports qualité →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
