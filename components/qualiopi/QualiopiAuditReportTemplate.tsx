"use client";

import React from "react";
import { QualiopiAuditPayload } from "@/app/actions/qualiopi-audit";
import { Printer, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from "lucide-react";

type Props = {
  data: QualiopiAuditPayload;
  onBack?: () => void;
};

export default function QualiopiAuditReportTemplate({ data, onBack }: Props) {
  const handlePrint = () => {
    window.print();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-300";
    if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-300";
    return "text-red-700 bg-red-50 border-red-300";
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-6 space-y-6 font-sans">
      {/* BARRE D'ACTIONS SUPÉRIEURE (NON IMPRIMÉE) */}
      <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-xl transition text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Dossier de Preuves RNQ Qualiopi</h2>
            <p className="text-xs text-slate-400">Date d'audit : {data.auditDate}</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
        >
          <Printer className="h-4 w-4" />
          <span>Imprimer / Exporter en PDF Officiel</span>
        </button>
      </div>

      {/* DOSSIER OFFICIEL FORMAT IMPRESSION */}
      <div
        className="bg-white text-slate-900 shadow-2xl rounded-2xl p-10 md:p-14 border border-slate-200 print:border-none print:shadow-none print:p-4 min-h-[297mm] flex flex-col justify-between"
      >
        {/* EN-TÊTE DU DOSSIER */}
        <div>
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <div className="inline-block px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-black uppercase tracking-wider mb-2">
                RÉFÉRENTIEL NATIONAL QUALITÉ — DÉMARCHE QUALIOPI
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-950">
                {data.schoolName}
              </h1>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Dossier de Conformité et Synthèse des Preuves d'Audit Qualité
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Date d'évaluation :</div>
              <div className="text-sm font-bold text-slate-900">{data.auditDate}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">Plateforme Skilla Auto-Pilot</div>
            </div>
          </div>

          {/* RÉSUMÉ EXÉCUTIF & SCORE GLOBAL */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl mb-8">
            <div className="flex flex-col justify-center border-r border-slate-200/80 pr-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Indice de Préparation :</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-blue-700">{data.globalReadinessScore}%</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getScoreColor(data.globalReadinessScore)}`}>
                  {data.globalReadinessScore >= 80 ? "Audit Favorable" : "Actions Requises"}
                </span>
              </div>
            </div>

            <div className="text-center p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Assiduité Globale</span>
              <span className="text-xl font-black text-emerald-600">{data.stats.attendanceRate}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Indicateur 11</span>
            </div>

            <div className="text-center p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Satisfaction Moyenne</span>
              <span className="text-xl font-black text-blue-600">{data.stats.satisfactionAvg ? `${data.stats.satisfactionAvg} / 5` : "N/A"}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{data.stats.satisfactionTotalResponses} avis (Ind. 30)</span>
            </div>

            <div className="text-center p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Résolution Réclamations</span>
              <span className="text-xl font-black text-purple-600">{data.stats.complaintsResolutionRate}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{data.stats.resolvedComplaints} traitées (Ind. 31)</span>
            </div>
          </div>

          {/* TABLEAU DES 7 INDICATEURS CLÉS DU RNQ */}
          <div className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <span>Grille de Conformité des Indicateurs Auditables</span>
            </h2>

            <div className="space-y-4">
              {data.indicators.map((ind) => (
                <div
                  key={ind.indicatorNumber}
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-xs font-black">
                        IND. {ind.indicatorNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Critère {ind.criterionNumber}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{ind.title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {ind.keyMetricLabel} : <strong>{ind.keyMetricValue}</strong>
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
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
                  </div>

                  <p className="text-xs text-slate-600 mb-3 italic">
                    « {ind.requirement} »
                  </p>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Éléments de Preuves Numériques Fournis ({ind.proofCount}) :
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                      {ind.proofsSummary.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  {ind.recommendation && (
                    <div className="mt-3 text-xs bg-amber-50/80 border border-amber-200 p-2.5 rounded-lg text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span><strong>Recommandation d'optimisation :</strong> {ind.recommendation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PLAN D'ACTION PRÉ-AUDIT */}
          {data.actionPlan.length > 0 && (
            <div className="mt-8 p-5 bg-blue-50/60 border border-blue-200 rounded-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>Plan d'Actions Correctives Avant le Passage de l'Auditeur</span>
              </h3>
              <ul className="divide-y divide-blue-100 text-xs text-blue-950">
                {data.actionPlan.map((ap, idx) => (
                  <li key={idx} className="py-1.5 flex items-center justify-between">
                    <span>• Indicateur {ap.indicatorNumber} : {ap.action}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200/60 text-blue-800">
                      {ap.priority === "HIGH" ? "Priorité Haute" : "Priorité Moyenne"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* PIED DE PAGE & SIGNATURE DIRECTION */}
        <div className="pt-8 border-t-2 border-slate-900 mt-10 flex justify-between items-end text-xs">
          <div className="text-slate-500 space-y-1">
            <p>Dossier généré et certifié par l'ERP Académique Skilla.</p>
            <p className="font-mono text-[10px]">Conforme au Décret n° 2019-565 du 6 juin 2019 relatif au RNQ.</p>
          </div>

          <div className="text-center min-w-[200px]">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-8">
              Visa du Référent Qualité / Direction :
            </p>
            <div className="border-t border-slate-300 pt-1 text-[10px] text-slate-400 font-mono">
              Signature & Cachet
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
