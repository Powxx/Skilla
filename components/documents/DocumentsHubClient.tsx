"use client";

import React, { useState } from "react";
import { StudentDocumentData, OfficialDocumentType } from "@/app/actions/documents";
import OfficialDocumentTemplate from "./OfficialDocumentTemplate";
import { 
  FileText, 
  CalendarCheck, 
  Briefcase, 
  Download, 
  Eye, 
  ShieldCheck, 
  Printer, 
  Sparkles,
  ArrowRight
} from "lucide-react";

type Props = {
  documentData: StudentDocumentData;
  userRole?: string;
};

export default function DocumentsHubClient({ documentData, userRole }: Props) {
  const [selectedType, setSelectedType] = useState<OfficialDocumentType | null>(null);

  const documentCards = [
    {
      type: "CERTIFICAT_SCOLARITE" as OfficialDocumentType,
      title: "Certificat de Scolarité",
      desc: "Atteste de l'inscription active et de la poursuite d'études pour l'année universitaire en cours.",
      badge: "Indispensable CAF / Transports",
      icon: FileText,
      color: "from-blue-600 to-indigo-700",
      accent: "text-blue-600 bg-blue-50 border-blue-200"
    },
    {
      type: "ATTESTATION_ASSIDUITE" as OfficialDocumentType,
      title: "Attestation d'Assiduité",
      desc: `Certifie le volume horaire suivi et le taux d'assiduité actuel (${documentData.attendance.attendanceRate}%).`,
      badge: "Pour Employeurs & OPCO",
      icon: CalendarCheck,
      color: "from-emerald-600 to-teal-700",
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200"
    },
    {
      type: "FICHE_ALTERNANCE" as OfficialDocumentType,
      title: "Attestation d'Alternance",
      desc: documentData.contract 
        ? `Contrat auprès de ${documentData.contract.companyName}.`
        : "Synthèse de stage ou d'apprentissage en entreprise.",
      badge: "Pour Entreprises & Tuteurs",
      icon: Briefcase,
      color: "from-amber-600 to-orange-700",
      accent: "text-amber-600 bg-amber-50 border-amber-200"
    }
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* BANNIÈRE D'EN-TÊTE */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 lg:p-10 shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Générateur Officiel Certifié</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Attestations & Documents Officiels
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Téléchargez en 1 clic vos certificats et attestations d'assiduité générés instantanément
              avec le cachet de l'établissement et référence d'authenticité.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-xs space-y-1.5 shrink-0">
            <p className="text-slate-400">Élève : <strong className="text-white">{documentData.student.fullName}</strong></p>
            <p className="text-slate-400">Classe : <strong className="text-white">{documentData.student.className}</strong></p>
            <p className="text-slate-400">Année : <strong className="text-white">{documentData.schoolYear.name}</strong></p>
          </div>
        </div>
      </div>

      {/* GRILLE DES DOCUMENTS DISPONIBLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {documentCards.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.type}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${doc.color} text-white shadow-lg shadow-blue-500/10`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${doc.accent}`}>
                    {doc.badge}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition tracking-tight">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {doc.desc}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setSelectedType(doc.type)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition shadow-md active:scale-95"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Aperçu & PDF</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-70" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL / VUE PLEIN ÉCRAN DU DOCUMENT SÉLECTIONNÉ */}
      {selectedType && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 flex items-start justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-4xl relative">
            <OfficialDocumentTemplate
              data={documentData}
              type={selectedType}
              onClose={() => setSelectedType(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
