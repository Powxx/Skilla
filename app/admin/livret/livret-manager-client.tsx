"use client";

import React, { useState, useMemo, useRef } from 'react';
import LivretBody from '@/components/livret/livret-body';
import Papa from 'papaparse';
import { createClassCompetency } from '@/app/admin/settings/competencies/actions';

type Props = {
  classes: any[];
  students: any[];
};

export default function AdminLivretManagerClient({ classes, students }: Props) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState('');
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

  // Map evaluations to LivretBody format
  const livretData = useMemo(() => {
    if (!selectedStudent || !selectedClass) return [];

    // Unique competency names for this class
    const compNames = Array.from(new Set(selectedClass.competencies.map((cc: any) => cc.name)));

    return compNames.flatMap((name: any, index) => {
      const schoolEval = selectedStudent.evaluations.find((e: any) => e.competency === name && e.category === 'SCHOOL');
      const enterpriseEval = selectedStudent.evaluations.find((e: any) => e.competency === name && e.category === 'ENTERPRISE');
      
      return [
        {
          id: `comp-${index}-school`,
          name: `${name} (École)`,
          level: schoolEval?.level || 1,
          category: 'SCHOOL',
          lastUpdated: new Date().toISOString()
        },
        {
          id: `comp-${index}-enterprise`,
          name: `${name} (Entreprise)`,
          level: enterpriseEval?.level || 1,
          category: 'ENTERPRISE',
          lastUpdated: new Date().toISOString()
        }
      ];
    });
  }, [selectedStudent, selectedClass]);

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
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">2. Choisir l'Élève</label>
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

          <div className="flex gap-2 lg:col-span-3">
             <button
               onClick={handlePrint}
               disabled={!selectedStudentId}
               className="h-12 flex-1 px-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.89l-2.26-2.26a1 1 0 010-1.41l2.26-2.26m10.56 0l2.26 2.26a1 1 0 010 1.41l-2.26 2.26m-6.78-2.26l2.26 2.26a1 1 0 001.41 0l2.26-2.26M10.5 10.5V16.5m3-6V16.5m-6-10.5h12" />
               </svg>
               Imprimer Livret
             </button>
             <button
               onClick={handleExportEvaluations}
               disabled={!selectedStudentId}
               className="h-12 px-4 rounded-2xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition disabled:opacity-50 flex items-center justify-center gap-2 border border-emerald-100"
               title="Exporter les évaluations de l'élève"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
               </svg>
               Export Evals
             </button>
             <button
               onClick={handleExportCompetencies}
               disabled={!selectedClassId}
               className="h-12 px-4 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
               title="Exporter le référentiel de la classe"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
               </svg>
             </button>
             <button
               onClick={() => fileInputRef.current?.click()}
               disabled={!selectedClassId}
               className="h-12 px-4 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
               title="Importer le référentiel pour cette classe"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3" />
               </svg>
             </button>
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImportCompetencies} 
          accept=".csv" 
          className="hidden" 
        />

        {!selectedClassId && (
          <p className="mt-4 text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-2">
            <span>⚠️</span> Veuillez d'abord sélectionner une classe pour voir la liste des élèves.
          </p>
        )}
      </div>

      {/* Livret Display */}
      {selectedStudent ? (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl print:shadow-none print:border-0 print:p-0">
          {/* Print-only Header */}
          <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-6">
             <div className="flex justify-between items-start">
                <div>
                   <h1 className="text-4xl font-black text-slate-900 uppercase">Livret d'Apprentissage</h1>
                   <p className="text-xl text-slate-500 font-bold mt-2">ECM Academie - Rapport Annuel</p>
                </div>
                <div className="text-right">
                   <p className="text-lg font-black text-slate-900">{selectedStudent.lastName} {selectedStudent.firstName}</p>
                   <p className="text-sm font-bold text-slate-500">{selectedClass?.name}</p>
                </div>
             </div>
          </div>

          <LivretBody 
            studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
            competencies={livretData}
          />

          <div className="mt-12 hidden print:grid grid-cols-2 gap-12 border-t border-slate-100 pt-10">
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signature de l'École</p>
                <div className="h-24 border-2 border-dashed border-slate-100 rounded-2xl"></div>
             </div>
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signature de l'Entreprise</p>
                <div className="h-24 border-2 border-dashed border-slate-100 rounded-2xl"></div>
             </div>
          </div>
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-3xl border border-slate-200 shadow-sm border-dashed">
           <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
           </div>
           <p className="text-slate-400 font-medium">Sélectionnez un élève pour générer son livret.</p>
        </div>
      )}
    </div>
  );
}
