"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  QUALIOPI_CRITERIA, 
  QUALIOPI_INDICATORS, 
  QualiopiIndicatorFull,
  getQualiopiReferentielStats 
} from "@/lib/qualiopi-referentiel";
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Printer, 
  FileText, 
  Search,
  ExternalLink,
  BookOpen,
  Award,
  Zap,
  ArrowRight,
  SlidersHorizontal
} from "lucide-react";

type IndicatorStatus = "CONFORME" | "EN_COURS" | "A_FAIRE" | "NON_APPLICABLE";

const STATUS_CONFIG: Record<IndicatorStatus, { label: string; badge: string; color: string; border: string }> = {
  CONFORME: {
    label: "Conforme & Prêt",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    color: "text-emerald-600",
    border: "border-emerald-500",
  },
  EN_COURS: {
    label: "En préparation",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    color: "text-amber-600",
    border: "border-amber-500",
  },
  A_FAIRE: {
    label: "À traiter",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    color: "text-rose-600",
    border: "border-rose-500",
  },
  NON_APPLICABLE: {
    label: "Non applicable",
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    color: "text-slate-400",
    border: "border-slate-300",
  },
};

export default function QualiopiReferentielClient() {
  const stats = getQualiopiReferentielStats();

  const [selectedCriterion, setSelectedCriterion] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "SKILLA_AUTO" | "CFA_ONLY" | "MAJOR">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndicator, setExpandedIndicator] = useState<number | null>(1); // Ouvert par défaut sur le premier

  // Gestion de l'état d'auto-évaluation sauvegardé dans localStorage
  const [statuses, setStatuses] = useState<Record<number, IndicatorStatus>>({});
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("skilla_qualiopi_statuses");
      if (saved) {
        setStatuses(JSON.parse(saved));
      } else {
        // Pré-initialiser les indicateurs automatisés par Skilla comme conformes
        const initial: Record<number, IndicatorStatus> = {};
        QUALIOPI_INDICATORS.forEach((ind) => {
          if (ind.isSkillaAutomated) {
            initial[ind.id] = "CONFORME";
          } else {
            initial[ind.id] = "EN_COURS";
          }
        });
        setStatuses(initial);
      }

      const savedTasks = localStorage.getItem("skilla_qualiopi_tasks");
      if (savedTasks) {
        setCheckedTasks(JSON.parse(savedTasks));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleStatusChange = (indicatorId: number, newStatus: IndicatorStatus) => {
    const updated = { ...statuses, [indicatorId]: newStatus };
    setStatuses(updated);
    try {
      localStorage.setItem("skilla_qualiopi_statuses", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleToggleTask = (taskKey: string) => {
    const updated = { ...checkedTasks, [taskKey]: !checkedTasks[taskKey] };
    setCheckedTasks(updated);
    try {
      localStorage.setItem("skilla_qualiopi_tasks", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Filtrage des indicateurs
  const filteredIndicators = QUALIOPI_INDICATORS.filter((ind) => {
    if (selectedCriterion !== null && ind.criterionId !== selectedCriterion) return false;
    if (filterType === "SKILLA_AUTO" && !ind.isSkillaAutomated) return false;
    if (filterType === "CFA_ONLY" && ind.appliesTo !== "CFA_ONLY") return false;
    if (filterType === "MAJOR" && ind.nonConformityType !== "MAJEURE") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ind.title.toLowerCase().includes(q);
      const matchReq = ind.requirement.toLowerCase().includes(q);
      const matchId = `indicateur ${ind.id}`.includes(q) || `ind ${ind.id}`.includes(q);
      if (!matchTitle && !matchReq && !matchId) return false;
    }

    return true;
  });

  // Calcul du score de conformité global
  const totalApplicable = QUALIOPI_INDICATORS.filter((i) => statuses[i.id] !== "NON_APPLICABLE").length;
  const totalConforme = QUALIOPI_INDICATORS.filter((i) => statuses[i.id] === "CONFORME").length;
  const readinessPct = totalApplicable > 0 ? Math.round((totalConforme / totalApplicable) * 100) : 0;

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* BANNIÈRE SUPÉRIEURE DU GUIDE ULTIME */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 lg:p-10 shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/20 text-violet-300 text-xs font-bold mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Guide & Référentiel Intégral Qualiopi (RNQ)</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Le Guide & Copilote Ultime d'Audit
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Préparez sereinement votre audit initial ou de surveillance : les 7 critères, les 32 indicateurs décodés, les questions types des auditeurs, les pièges à éviter et les preuves automatisées par Skilla.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition active:scale-95 shrink-0"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer l'Auto-Diagnostic</span>
            </button>
            <Link
              href="/admin/qualiopi/audit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-500/30 transition active:scale-95 shrink-0"
            >
              <FileText className="h-4 w-4" />
              <span>Dossier de Preuves 1-Click</span>
            </Link>
          </div>
        </div>
      </div>

      {/* DASHBOARD DE PRÉPARATION & KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SCORE DE PRÉPARATION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Score de Préparation</span>
              <ShieldCheck className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black text-slate-900">{readinessPct}%</span>
              <span className="text-xs font-bold text-slate-500">
                ({totalConforme}/{totalApplicable} prêts)
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${readinessPct >= 80 ? "bg-emerald-500" : readinessPct >= 50 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${readinessPct}%` }}
            />
          </div>
        </div>

        {/* AUTOMATISÉS PAR SKILLA */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Automatisés par Skilla</span>
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-4">
            {stats.automatedBySkilla} <span className="text-sm font-bold text-slate-400">/ 32</span>
          </div>
          <p className="text-xs text-emerald-600 font-bold mt-1">
            ⚡ {stats.automatedPct}% du référentiel couvert nativement
          </p>
        </div>

        {/* SPÉCIFIQUES CFA / ALTERNANCE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Spécifiques CFA</span>
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-600 mt-4">{stats.cfaSpecific}</div>
          <p className="text-xs text-slate-500 mt-1">Indicateurs 12, 13, 14, 15, 20, 28, 29</p>
        </div>

        {/* NON-CONFORMITÉS MAJEURES */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Exigences Majeures</span>
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-rose-600 mt-4">{stats.majorIndicators}</div>
          <p className="text-xs text-slate-500 mt-1">À sécuriser en priorité absolue</p>
        </div>
      </div>

      {/* SÉLECTEUR DE CRITÈRES 1 À 7 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
            Explorer par Critère RNQ (1 à 7)
          </h2>
          {selectedCriterion !== null && (
            <button
              onClick={() => setSelectedCriterion(null)}
              className="text-xs font-bold text-violet-600 hover:text-violet-800 transition"
            >
              Afficher tous les critères
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {QUALIOPI_CRITERIA.map((crit) => {
            const isSelected = selectedCriterion === crit.id;
            const critIndicators = QUALIOPI_INDICATORS.filter((i) => i.criterionId === crit.id);
            const critConforme = critIndicators.filter((i) => statuses[i.id] === "CONFORME").length;
            const pct = Math.round((critConforme / critIndicators.length) * 100) || 0;

            return (
              <button
                key={crit.id}
                onClick={() => setSelectedCriterion(isSelected ? null : crit.id)}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-600/20"
                    : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      Critère {crit.id}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? "text-violet-200" : "text-slate-400"}`}>
                      {critConforme}/{critIndicators.length}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold leading-tight line-clamp-2 mt-1">
                    {crit.title}
                  </h4>
                </div>

                <div className={`w-full h-1.5 rounded-full mt-3 overflow-hidden ${isSelected ? "bg-white/20" : "bg-slate-100"}`}>
                  <div
                    className={`h-full transition-all duration-500 ${isSelected ? "bg-white" : pct === 100 ? "bg-emerald-500" : "bg-violet-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BARRE D'OUTILS ET FILTRES */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* RECHERCHE */}
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un indicateur, mot-clé, exigence..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:border-violet-500 focus:bg-white transition"
          />
        </div>

        {/* FILTRES RAPIDES */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: "ALL", label: "Tous les 32" },
            { id: "SKILLA_AUTO", label: "⚡ Automatisés Skilla" },
            { id: "CFA_ONLY", label: "CFA / Alternance" },
            { id: "MAJOR", label: "⚠️ Exigences Majeures" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition ${
                filterType === f.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE DES 32 INDICATEURS INTERACTIFS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500">
            {filteredIndicators.length} indicateur(s) affiché(s)
          </span>
          <button
            onClick={() => setExpandedIndicator(expandedIndicator === null ? filteredIndicators[0]?.id ?? null : null)}
            className="text-xs font-bold text-violet-600 hover:text-violet-800 transition"
          >
            {expandedIndicator === null ? "Déplier le premier" : "Replier tout"}
          </button>
        </div>

        {filteredIndicators.map((ind) => {
          const isExpanded = expandedIndicator === ind.id;
          const currentStatus = statuses[ind.id] || "EN_COURS";
          const statusCfg = STATUS_CONFIG[currentStatus];

          return (
            <div
              key={ind.id}
              className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm ${
                isExpanded ? "border-violet-400 ring-2 ring-violet-500/10 shadow-md" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* EN-TÊTE DE LA CARTE INDICATEUR */}
              <div
                onClick={() => setExpandedIndicator(isExpanded ? null : ind.id)}
                className="p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
              >
                <div className="flex items-start gap-4">
                  <span className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-black shrink-0 tracking-wider">
                    IND. {ind.id}
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                        Critère {ind.criterionId}
                      </span>
                      {ind.isSkillaAutomated && (
                        <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Zap className="h-3 w-3 text-emerald-600" />
                          <span>Automatisé par Skilla</span>
                        </span>
                      )}
                      {ind.appliesTo === "CFA_ONLY" && (
                        <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                          CFA
                        </span>
                      )}
                      {ind.nonConformityType === "MAJEURE" && (
                        <span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                          Non-conf. Majeure
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {ind.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  {/* SÉLECTEUR DE STATUT D'AUTO-ÉVALUATION */}
                  <select
                    value={currentStatus}
                    onChange={(e) => handleStatusChange(ind.id, e.target.value as IndicatorStatus)}
                    className={`text-xs font-black uppercase px-3 py-2 rounded-xl border focus:outline-none transition cursor-pointer ${statusCfg.badge}`}
                  >
                    {(Object.keys(STATUS_CONFIG) as IndicatorStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_CONFIG[st].label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setExpandedIndicator(isExpanded ? null : ind.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* DÉTAIL DÉPLIÉ (LE GUIDE COMPLET DE L'INDICATEUR) */}
              {isExpanded && (
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-6">
                  {/* 1. EXIGENCE OFFICIELLE DU MINISTÈRE */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Exigence officielle (Guide de lecture RNQ)
                    </span>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {ind.requirement}
                    </p>
                  </div>

                  {/* 2. CE QUE SKILLA FAIT AUTOMATIQUEMENT (SI APPLICABLE) */}
                  {ind.isSkillaAutomated && ind.skillaContribution && (
                    <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                        <Zap className="h-4 w-4 text-emerald-600" />
                        <span>Ce que Skilla prend en charge automatiquement pour vous :</span>
                      </div>
                      <p className="text-emerald-900 leading-relaxed">
                        {ind.skillaContribution}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 3. PREUVES ATTENDUES LE JOUR DE L'AUDIT */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Éléments de preuve types acceptés</span>
                      </span>
                      <ul className="space-y-1.5">
                        {ind.expectedProofs.map((proof, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <span>{proof}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 4. QUESTIONS TYPES DE L'AUDITEUR */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Questions que posera l'auditeur</span>
                      </span>
                      <ul className="space-y-1.5">
                        {ind.auditorQuestions.map((q, i) => (
                          <li key={i} className="text-xs text-slate-700 italic flex items-start gap-2">
                            <span className="text-purple-500 font-bold shrink-0">«</span>
                            <span>{q} »</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 5. PIÈGES À ÉVITER ABSOLUMENT */}
                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 text-xs space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      <span>Pièges à éviter absolument (Motifs d'écart fréquents)</span>
                    </span>
                    <ul className="space-y-1 mt-1">
                      {ind.trapsToAvoid.map((trap, i) => (
                        <li key={i} className="text-rose-950 flex items-start gap-2 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>{trap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 6. CHECKLIST D'ACTION INTERACTIVE */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                      Checklist d'auto-contrôle avant le jour J :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ind.actionChecklist.map((task, i) => {
                        const taskKey = `ind_${ind.id}_task_${i}`;
                        const isChecked = Boolean(checkedTasks[taskKey]);
                        return (
                          <label
                            key={i}
                            className={`p-3 rounded-xl border text-xs flex items-center gap-3 cursor-pointer transition select-none ${
                              isChecked
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleTask(taskKey)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                            />
                            <span className={isChecked ? "line-through opacity-75" : "font-medium"}>
                              {task}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
