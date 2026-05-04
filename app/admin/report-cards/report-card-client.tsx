"use client";

import React, { useState, useTransition } from 'react';
import { calculateStudentAverages, saveReportCard } from './actions';

export default function ReportCardClient({ students, semesters }: any) {
  const [isPending, startTransition] = useTransition();
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(semesters[0]?.id || '');
  const [averages, setAverages] = useState<any[]>([]);
  const [appraisal, setAppraisal] = useState('');
  const [distinction, setDistinction] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleFetchAverages = () => {
    if (!selectedStudent || !selectedSemester) return;
    startTransition(async () => {
      const data = await calculateStudentAverages(selectedStudent, selectedSemester);
      setAverages(data);
      setShowForm(true);
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveReportCard({
        studentId: selectedStudent,
        semesterId: selectedSemester,
        generalAppraisal: appraisal,
        distinction: distinction
      });
      if (res.ok) {
        alert("Bulletin enregistré avec succès !");
        setShowForm(false);
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Élève</label>
          <select 
            className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-500/20"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="">Sélectionner un élève</option>
            {students.map((s: any) => (
              <option key={s.id} value={s.id}>[{s.className}] {s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Semestre</label>
          <select 
            className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-500/20"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            {semesters.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={handleFetchAverages}
          disabled={isPending || !selectedStudent}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
        >
          {isPending ? "Chargement..." : "Préparer le bulletin"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
             <h2 className="text-xl font-bold text-slate-900">Récapitulatif des Moyennes</h2>
             <p className="text-sm text-slate-500 mt-1">Vérifiez les résultats avant de valider le bulletin.</p>
          </div>

          <div className="p-8 grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              {averages.map((a: any) => (
                <div key={a.subjectId} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-700">{a.subjectName}</span>
                  <span className="text-lg font-black text-blue-600">{a.average.toFixed(2)}<span className="text-[10px] text-slate-400 ml-1">/20</span></span>
                </div>
              ))}
              {averages.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  Aucune note trouvée pour ce semestre.
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Appréciation Générale</label>
                <textarea 
                  className="w-full rounded-2xl border-slate-200 text-sm focus:ring-blue-500/20 h-32"
                  placeholder="Écrivez ici le bilan du semestre..."
                  value={appraisal}
                  onChange={(e) => setAppraisal(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Distinction / Mention</label>
                <input 
                  type="text"
                  className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-500/20"
                  placeholder="Ex: Félicitations, Compliments..."
                  value={distinction}
                  onChange={(e) => setDistinction(e.target.value)}
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={isPending}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
              >
                {isPending ? "Enregistrement..." : "Valider et Enregistrer le Bulletin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
