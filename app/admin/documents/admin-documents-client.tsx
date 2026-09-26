"use client";

import React, { useState } from "react";
import { getStudentDocumentData, StudentDocumentData, OfficialDocumentType } from "@/app/actions/documents";
import OfficialDocumentTemplate from "@/components/documents/OfficialDocumentTemplate";
import { 
  FileText, 
  Search, 
  UserCheck, 
  Eye, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  CalendarCheck,
  Briefcase
} from "lucide-react";

type StudentOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  classId: string | null;
  className: string;
};

type Props = {
  classes: { id: string; name: string }[];
  students: StudentOption[];
};

export default function AdminDocumentsClient({ classes, students }: Props) {
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentDocData, setCurrentDocData] = useState<StudentDocumentData | null>(null);
  const [activeDocType, setActiveDocType] = useState<OfficialDocumentType>("CERTIFICAT_SCOLARITE");

  const filteredStudents = students.filter(s => {
    const matchesClass = selectedClassId === "ALL" || s.classId === selectedClassId;
    const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
    const matchesSearch = search === "" || name.includes(search.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const handleSelectStudent = async (studentId: string, docType: OfficialDocumentType) => {
    setSelectedStudentId(studentId);
    setActiveDocType(docType);
    setLoading(true);

    try {
      const res = await getStudentDocumentData(studentId);
      if (res.ok) {
        setCurrentDocData(res.data);
      } else {
        alert(res.error);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* EN-TÊTE ADMIN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2 border border-blue-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Pôle Administratif & Certifications</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Générateur d'Attestations Officielles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Éditez et téléchargez les certificats de scolarité, attestations d'assiduité et fiches d'alternance pour tous les étudiants.
          </p>
        </div>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un élève par nom ou prénom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Classe :</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full md:w-64 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">Toutes les classes ({students.length} élèves)</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLEAU DES ÉLÈVES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
          <span>{filteredStudents.length} apprenant(s) trouvé(s)</span>
          <span>Actions Documents</span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Aucun étudiant ne correspond à votre recherche.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {filteredStudents.map(student => (
              <div
                key={student.id}
                className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200">
                    {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">
                      {student.lastName} {student.firstName}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {student.className}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleSelectStudent(student.id, "CERTIFICAT_SCOLARITE")}
                    className="flex-1 sm:flex-initial flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-bold transition active:scale-95"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Scolarité</span>
                  </button>

                  <button
                    onClick={() => handleSelectStudent(student.id, "ATTESTATION_ASSIDUITE")}
                    className="flex-1 sm:flex-initial flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition active:scale-95"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    <span>Assiduité</span>
                  </button>

                  <button
                    onClick={() => handleSelectStudent(student.id, "FICHE_ALTERNANCE")}
                    className="flex-1 sm:flex-initial flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 text-xs font-bold transition active:scale-95"
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>Alternance</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CHARGEMENT OU APERÇU MODAL */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm font-bold text-slate-800">Génération certifiée en cours...</span>
          </div>
        </div>
      )}

      {currentDocData && !loading && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 flex items-start justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-4xl relative">
            <OfficialDocumentTemplate
              data={currentDocData}
              type={activeDocType}
              onClose={() => setCurrentDocData(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
