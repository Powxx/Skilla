"use client";

import React, { useState, useMemo, useRef } from 'react';
import LivretBody from '@/components/livret/livret-body';
import Papa from 'papaparse';
import { createClassCompetency } from '@/app/admin/settings/competencies/actions';

type Props = {
  classes: any[];
  students: any[];
  semesters: any[];
};

export default function AdminLivretManagerClient({ classes, students, semesters }: Props) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState(semesters[0]?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter students based on selected class
  const classStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Reset selected student if class changes
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSelectedStudentId('');
  };

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const handleExportCompetencies = () => {
    if (!selectedClass) return;
    const data = selectedClass.competencies.map((c: any) => ({
      Nom: c.name,
      Catégorie: c.category
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `competences_${selectedClass.name}.csv`);
    link.click();
  };

  const handleImportCompetencies = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClassId) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const payload = results.data.map((row: any) => ({
          classId: selectedClassId,
          name: row.Nom || row.name || "",
          category: (row.Catégorie || row.category || "SCHOOL").toUpperCase()
        })).filter((c: any) => c.name);

        Promise.all(payload.map(comp => createClassCompetency(comp))).then(() => {
           alert("Importation réussie.");
           window.location.reload(); // Refresh to get new competencies
        });
      }
    });
  };

  // Map evaluations to LivretBody format (filtered by semester)
  const livretData = useMemo(() => {
    if (!selectedStudent || !selectedClass || !selectedSemesterId) return [];

    // Unique competency names for this class
    const compNames = Array.from(new Set(selectedClass.competencies.map((cc: any) => cc.name)));

    return compNames.flatMap((name: any, index) => {
      const schoolEval = selectedStudent.evaluations.find((e: any) => e.competency === name && e.category === 'SCHOOL' && e.semesterId === selectedSemesterId);
      const enterpriseEval = selectedStudent.evaluations.find((e: any) => e.competency === name && e.category === 'ENTERPRISE' && e.semesterId === selectedSemesterId);
      
      return [
        {
          id: `comp-${index}-school`,
          name: `${name} (École)`,
          level: schoolEval?.level || 1,
          category: 'SCHOOL',
          lastUpdated: schoolEval?.updatedAt || new Date().toISOString()
        },
        {
          id: `comp-${index}-enterprise`,
          name: `${name} (Entreprise)`,
          level: enterpriseEval?.level || 1,
          category: 'ENTERPRISE',
          lastUpdated: enterpriseEval?.updatedAt || new Date().toISOString()
        }
      ];
    });
  }, [selectedStudent, selectedClass, selectedSemesterId]);

  const handleExportEvaluations = () => {
    if (!selectedStudent || !selectedClass) return;
    const data = selectedStudent.evaluations.map((e: any) => ({
      Élève: `${selectedStudent.lastName} ${selectedStudent.firstName}`,
      Classe: selectedClass.name,
      Compétence: e.competency,
      Niveau: e.level,
      Catégorie: e.category
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `evaluations_${selectedStudent.lastName}_${selectedStudent.firstName}.csv`);
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Selectors Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">1. Choisir la Classe</label>
            <select
              className="w-full rounded-2xl border-slate-200 text-sm font-bold focus:ring-slate-900 focus:border-slate-900 h-12"
              value={selectedClassId}
              onChange={handleClassChange}
            >
              <option value="" disabled>Sélectionner une classe</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">2. Choisir le Semestre</label>
            <select
              className="w-full rounded-2xl border-slate-200 text-sm font-bold focus:ring-slate-900 focus:border-slate-900 h-12"
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.schoolYear?.name ? ` (${s.schoolYear.name})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">3. Choisir l'Élève</label>
            <select
              className="w-full rounded-2xl border-slate-200 text-sm font-bold focus:ring-slate-900 focus:border-slate-900 h-12"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={!selectedClassId}
            >
              <option value="">-- Sélectionner un élève --</option>
              {classStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 lg:col-span-2">
             <button
               onClick={handlePrint}
               disabled={!selectedStudentId}
               className="h-12 flex-1 px-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
             >
               Imprimer
             </button>
             <button
               onClick={handleExportEvaluations}
               disabled={!selectedStudentId}
               className="h-12 px-4 rounded-2xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition disabled:opacity-50 flex items-center justify-center gap-2 border border-emerald-100"
               title="Exporter les évaluations de l'élève"
             >
               Export
             </button>
             <button
               onClick={handleExportCompetencies}
               disabled={!selectedClassId}
               className="h-12 px-4 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
               title="Exporter le référentiel"
             >
               Export Réf.
             </button>
          </div>
        </div>
      </div>

      {/* Livret Display */}
      {selectedStudent ? (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl print:shadow-none print:border-0 print:p-0">
          <LivretBody 
            studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
            competencies={livretData}
          />
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-3xl border border-slate-200 shadow-sm border-dashed">
           <p className="text-slate-400 font-medium">Sélectionnez un élève pour générer son livret.</p>
        </div>
      )}
    </div>
  );
}
