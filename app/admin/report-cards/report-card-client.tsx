"use client";

import React, { useState, useTransition } from 'react';
import { calculateStudentAverages, saveReportCard } from './actions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
                  <span className="text-lg font-black text-blue-600">
                    {a.average !== null ? a.average.toFixed(2) : '—'}
                    {a.average !== null && <span className="text-[10px] text-slate-400 ml-1">/20</span>}
                  </span>
                </div>
              ))}
              {averages.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  Aucune matière trouvée pour cette classe.
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
              <div className="flex gap-4">
                <button 
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                  {isPending ? "Enregistrement..." : "Valider et Enregistrer le Bulletin"}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
                >
                  🖨️
                </button>
              </div>
            </div>
          </div>

          {/* Print Only Section */}
          <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-12">
              <header className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
                <div>
                  <h1 className="text-4xl font-black text-slate-900">BULLETIN SCOLAIRE</h1>
                  <p className="text-xl text-slate-500 mt-2">{semesters.find((s: any) => s.id === selectedSemester)?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">ECM Academie</p>
                  <p className="text-sm text-slate-500">Portail Académique</p>
                </div>
              </header>

              <section className="grid grid-cols-2 gap-12">
                <div>
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Élève</h3>
                   <p className="text-2xl font-black text-slate-900">{students.find((s: any) => s.id === selectedStudent)?.name}</p>
                   <p className="text-slate-500 font-medium">Classe : {students.find((s: any) => s.id === selectedStudent)?.className}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-right">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Moyenne Élève</h3>
                     <p className="text-4xl font-black text-blue-600">
                       {(() => {
                         const graded = averages.filter((a: any) => a.average !== null);
                         if (graded.length === 0) return '—';
                         return (graded.reduce((acc: number, cur: any) => acc + cur.average, 0) / graded.length).toFixed(2);
                       })()}
                     </p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-right">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Moyenne Classe</h3>
                     <p className="text-4xl font-black text-slate-900">
                       {(() => {
                         const graded = averages.filter((a: any) => a.classAverage !== null);
                         if (graded.length === 0) return '—';
                         return (graded.reduce((acc: number, cur: any) => acc + cur.classAverage, 0) / graded.length).toFixed(2);
                       })()}
                     </p>
                  </div>
                </div>
              </section>

              <section>
                 <table className="w-full border-collapse">
                   <thead>
                     <tr className="border-b-2 border-slate-900">
                       <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-900">Matière</th>
                       <th className="py-4 text-right text-xs font-black uppercase tracking-widest text-slate-900">Moy. Élève</th>
                       <th className="py-4 text-right text-xs font-black uppercase tracking-widest text-slate-900">Moy. Classe</th>
                       <th className="py-4 text-right text-xs font-black uppercase tracking-widest text-slate-900">Appréciation</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {averages.map((a: any) => (
                       <tr key={a.subjectId}>
                         <td className="py-6 font-bold text-slate-900">{a.subjectName}</td>
                         <td className="py-6 text-right font-black text-blue-600 text-lg">
                           {a.average !== null ? a.average.toFixed(2) : '—'}
                         </td>
                         <td className="py-6 text-right font-bold text-slate-500">
                           {a.classAverage !== null ? a.classAverage.toFixed(2) : '—'}
                         </td>
                         <td className="py-6 text-right text-slate-400 italic text-sm">
                           {a.comments || "—"}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </section>

              <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Bilan de l'établissement</h3>
                 <p className="text-xl font-medium leading-relaxed">"{appraisal}"</p>
                 {distinction && (
                   <div className="mt-6 pt-6 border-t border-white/10">
                     <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Mention : {distinction}</p>
                   </div>
                 )}
              </section>

              <footer className="pt-20 flex justify-between items-end border-t border-slate-100">
                 <div className="text-xs text-slate-400">
                   Document généré le {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}
                 </div>
                 <div className="text-center w-64">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-12">Cachet et Signature</p>
                   <div className="h-px w-full bg-slate-200"></div>
                 </div>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
