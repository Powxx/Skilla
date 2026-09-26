"use client";

import React, { useRef } from "react";
import { StudentDocumentData, OfficialDocumentType } from "@/app/actions/documents";
import { Printer, Download, ShieldCheck, CheckCircle2 } from "lucide-react";

type Props = {
  data: StudentDocumentData;
  type: OfficialDocumentType;
  onClose?: () => void;
};

export default function OfficialDocumentTemplate({ data, type, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const getDocTitle = () => {
    switch (type) {
      case "CERTIFICAT_SCOLARITE":
        return "CERTIFICAT DE SCOLARITÉ";
      case "ATTESTATION_ASSIDUITE":
        return "ATTESTATION D'ASSIDUITÉ ET DE PRÉSENCE";
      case "FICHE_ALTERNANCE":
        return "ATTESTATION DE CONTRAT D'ALTERNANCE";
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto my-4">
      {/* Barre d'action supérieure (masquée à l'impression) */}
      <div className="w-full flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">{getDocTitle()}</h3>
            <p className="text-xs text-slate-400">Réf. officielle : {data.documentRef}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Fermer
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimer / Enregistrer en PDF</span>
          </button>
        </div>
      </div>

      {/* FEUILLE OFFICIELLE FORMAT A4 */}
      <div
        ref={printRef}
        className="w-full bg-white text-slate-900 shadow-2xl rounded-sm p-12 md:p-16 border border-slate-200 print:border-none print:shadow-none print:p-8 min-h-[297mm] flex flex-col justify-between relative"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        {/* FILIGRANE DE SÉCURITÉ */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-8xl font-black uppercase rotate-45 tracking-widest">
            {data.schoolInfo.shortName}
          </span>
        </div>

        {/* EN-TÊTE OFFICIEL */}
        <div>
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8 font-sans">
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase text-slate-950">
                {data.schoolInfo.name}
              </h1>
              <p className="text-xs text-slate-600 mt-1">{data.schoolInfo.address}</p>
              <p className="text-xs text-slate-600">
                Tél : {data.schoolInfo.phone} — Email : {data.schoolInfo.email}
              </p>

            </div>

            <div className="text-right">

              <p className="text-xs text-slate-500 mt-2">
                Fait à Alès, le {data.issuedAt}
              </p>

            </div>
          </div>

          {/* TITRE DU DOCUMENT */}
          <div className="text-center my-10 font-sans">
            <h2 className="text-2xl font-black tracking-wider uppercase border-y-2 border-slate-900 py-3 inline-block px-8 text-slate-950">
              {getDocTitle()}
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
              Année Universitaire & Académique {data.schoolYear.name}
            </p>
          </div>

          {/* CORPS DU DOCUMENT */}
          <div className="text-base leading-relaxed space-y-6 text-slate-800 text-justify">
            <p>
              Je soussigné(e), <strong>{data.schoolInfo.directorName}</strong>, agissant en qualité de
              représentant légal de l'établissement d'enseignement supérieur <strong>{data.schoolInfo.name}</strong>,
              certifie par la présente que :
            </p>

            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 font-sans my-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Élève / Apprenant(e) :</span>
                  <span className="text-base font-bold text-slate-900">{data.student.fullName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Date de naissance :</span>
                  <span className="font-semibold text-slate-900">{data.student.birthday || "Non renseignée"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Classe / Cursus :</span>
                  <span className="font-bold text-blue-700">{data.student.className}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Identifiant Registre :</span>
                  <span className="font-mono text-slate-700">{data.student.id}</span>
                </div>
                {data.student.address && (
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Adresse déclarée :</span>
                    <span className="text-slate-800">{data.student.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* CONTENU SPÉCIFIQUE SELON LE TYPE */}
            {type === "CERTIFICAT_SCOLARITE" && (
              <div className="space-y-4">
                <p>
                  Est régulièrement inscrit(e) et poursuit sa formation au sein de notre établissement pour
                  l'année scolaire <strong>{data.schoolYear.name}</strong> (du {data.schoolYear.startDate} au {data.schoolYear.endDate}).
                </p>
                <p>
                  L'enseignement dispensé correspond à une formation certifiée et reconnue, dispensée en cycle continu et/ou en alternance.
                </p>
              </div>
            )}

            {type === "ATTESTATION_ASSIDUITE" && (
              <div className="space-y-4">
                <p>
                  A régulièrement suivi les enseignements dispensés depuis le début de l'année scolaire.
                </p>
                <div className="bg-slate-50 p-4 border border-slate-200 rounded font-sans text-xs grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-slate-500 block">Taux d'assiduité global</span>
                    <span className="text-lg font-black text-emerald-600">{data.attendance.attendanceRate}%</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-slate-500 block">Cours dispensés</span>
                    <span className="text-lg font-black text-slate-800">{data.attendance.totalLessons}</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-slate-500 block">Absences justifiées</span>
                    <span className="text-lg font-black text-slate-800">{data.attendance.excusedCount}</span>
                  </div>
                </div>
                <p>
                  L'élève fait preuve d'un engagement conforme aux exigences d'assiduité du règlement intérieur et des conventions de formation.
                </p>
              </div>
            )}

            {type === "FICHE_ALTERNANCE" && (
              <div className="space-y-4">
                {data.contract ? (
                  <>
                    <p>
                      Est actuellement engagé(e) dans le cadre d'un <strong>{data.contract.type}</strong> auprès de l'entreprise d'accueil partenaire :
                    </p>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded font-sans text-xs space-y-1">
                      <p><strong>Entreprise :</strong> {data.contract.companyName}</p>
                      {data.contract.tutorName && <p><strong>Tuteur / Maître d'apprentissage :</strong> {data.contract.tutorName}</p>}
                      <p><strong>Période du contrat :</strong> Du {data.contract.startDate} au {data.contract.endDate}</p>
                    </div>
                  </>
                ) : (
                  <p>
                    L'étudiant(e) est inscrit(e) sous statut scolaire classique ou en cours de validation de placement en entreprise.
                  </p>
                )}
              </div>
            )}

            <p className="pt-4 italic">
              Le présent document est délivré à l'intéressé(e) pour servir et valoir ce que de droit auprès de tout organisme officiel
              (Caisse d'Allocations Familiales, sécurité sociale, régie de transports, employeur ou organisme de financement).
            </p>
          </div>
        </div>

        {/* SIGNATURE & CACHET OFFICIEL */}
        <div className="pt-12 border-t border-slate-300 mt-12 font-sans">
          <div className="flex justify-between items-end">


            {/* Bloc Signature Direction */}
            <div className="text-center min-w-[220px]">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pour l'établissement,
              </p>
              <p className="text-sm font-black text-slate-950">
                {data.schoolInfo.directorName}
              </p>

              {/* Cachet stylisé */}


              <p className="text-[9px] font-mono text-slate-400">Document généré électroniquement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
