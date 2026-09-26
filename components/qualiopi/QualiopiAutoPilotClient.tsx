"use client";

import React, { useState } from "react";
import { QualiopiAuditPayload } from "@/app/actions/qualiopi-audit";
import QualiopiAuditReportTemplate from "./QualiopiAuditReportTemplate";
import { 
  ShieldCheck, 
  FileCheck2, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  GraduationCap, 
  Briefcase, 
  HeartHandshake,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";

type Props = {
  auditData: QualiopiAuditPayload;
};

export default function QualiopiAutoPilotClient({ auditData }: Props) {
  const [showFullDossier, setShowFullDossier] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (showFullDossier) {
    return (
      <QualiopiAuditReportTemplate
        data={auditData}
        onBack={() => setShowFullDossier(false)}
      />
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* BANNIÈRE SUPÉRIEURE DU PILOTE QUALIOPI */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 lg:p-10 shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Qualiopi Auto-Pilot & RNQ 1-Click</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Audit Qualité & Dossier de Preuves
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Skilla compile automatiquement les indicateurs réglementaires du Référentiel National Qualité (RNQ) :
              assiduité, enquêtes de satisfaction, réclamations et suivi des compétences.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowFullDossier(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/30 transition-all active:scale-95 shrink-0"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Générer le Dossier d'Audit (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* JAUGES ET STATISTIQUES GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* SCORE GLOBAL */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Score de Préparation</span>
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black text-slate-900">{auditData.globalReadinessScore}%</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getScoreColor(auditData.globalReadinessScore)}`}>
                {auditData.globalReadinessScore >= 80 ? "Favorable" : "À consolider"}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${auditData.globalReadinessScore >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${auditData.globalReadinessScore}%` }}
            />
          </div>
        </div>

        {/* ASSIDUITÉ */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Indicateur 11 — Assiduité</span>
            <Clock className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-4">{auditData.stats.attendanceRate}%</div>
          <p className="text-xs text-slate-500 mt-1">Sur l'ensemble des cours programmés</p>
        </div>

        {/* SATISFACTION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Indicateur 30 — Satisfaction</span>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-600 mt-4">
            {auditData.stats.satisfactionAvg ? `${auditData.stats.satisfactionAvg} / 5` : "En attente"}
          </div>
          <p className="text-xs text-slate-500 mt-1">{auditData.stats.satisfactionTotalResponses} avis recueillis</p>
        </div>

        {/* RÉCLAMATIONS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Indicateur 31 — Réclamations</span>
            <HeartHandshake className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-600 mt-4">{auditData.stats.complaintsResolutionRate}%</div>
          <p className="text-xs text-slate-500 mt-1">
            {auditData.stats.resolvedComplaints} traitées sur {auditData.stats.openComplaints + auditData.stats.resolvedComplaints}
          </p>
        </div>
      </div>

      {/* PLAN D'ACTIONS AVANT AUDIT */}
      {auditData.actionPlan.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="font-black text-sm text-amber-900 tracking-tight">
              Actions recommandées pour maximiser le score d'audit
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {auditData.actionPlan.map((item, idx) => (
              <div key={idx} className="bg-white/80 p-3 rounded-xl border border-amber-200/50 text-xs text-amber-950 flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <strong>Indicateur {item.indicatorNumber} :</strong> {item.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRILLE DES INDICATEURS RNQ AVEC PREUVES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Indicateurs Réglementaires RNQ Auditables
          </h2>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            {auditData.indicators.filter(i => i.status === "CONFORME").length} / {auditData.indicators.length} conformes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auditData.indicators.map((ind) => (
            <div
              key={ind.indicatorNumber}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-black">
                      IND. {ind.indicatorNumber}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Critère {ind.criterionNumber}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      ind.status === "CONFORME"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : ind.status === "ATTENTION"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {ind.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug mb-2">
                  {ind.title}
                </h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                  {ind.requirement}
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="font-bold text-slate-700 flex justify-between">
                    <span>{ind.keyMetricLabel} :</span>
                    <span className="text-blue-600">{ind.keyMetricValue}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ind.proofsSummary[0]}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {ind.proofCount} élément(s) de preuve
                </span>
                <button
                  onClick={() => setShowFullDossier(true)}
                  className="font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                >
                  <span>Voir preuves</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
