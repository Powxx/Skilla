"use client";

import React, { useState, useTransition } from 'react';
import { calculateStudentAverages, saveReportCard, toggleClassReportCardsVisibility } from './actions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye, EyeOff } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  className: string;
  classId?: string;
}

interface Semester {
  id: string;
  name: string;
  schoolYear?: string | null;
}

interface ClassVisibility {
  id: string;
  name: string;
  reportCardsVisible: boolean;
}

interface AverageData {
  subjectId: string;
  subjectName: string;
  teacherNames: string;
  average: number | null;
  classAverage: number | null;
  comments: string;
  isDispensed: boolean;
}

interface Props {
  students: Student[];
  semesters: Semester[];
  initialClasses?: ClassVisibility[];
}

export default function ReportCardClient({ students, semesters, initialClasses = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(semesters[0]?.id || '');
  const [averages, setAverages] = useState<AverageData[]>([]);
  const [appraisal, setAppraisal] = useState('');
  const [distinction, setDistinction] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [classList, setClassList] = useState<ClassVisibility[]>(initialClasses);

  const handleToggleVisibility = (classId: string, currentVisible: boolean) => {
    const newVisible = !currentVisible;
    startTransition(async () => {
      const res = await toggleClassReportCardsVisibility(classId, newVisible);
      if (res.ok) {
        setClassList(classList.map((c) => c.id === classId ? { ...c, reportCardsVisible: newVisible } : c));
      }
    });
  };

  const handleBulkToggle = (visible: boolean) => {
    startTransition(async () => {
        for (const c of classList) {
            await toggleClassReportCardsVisibility(c.id, visible);
        }
        setClassList(classList.map(c => ({ ...c, reportCardsVisible: visible })));
    });
  };

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
        distinction: distinction,
        subjectComments: averages.map(a => ({ subjectId: a.subjectId, comment: a.comments }))
      });
      if (res.ok) {
        alert("Bulletin enregistré avec succès !");
        setShowForm(false);
      }
    });
  };

  return (
    <div className="space-y-8">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-only, .print-only * {
            visibility: visible;
          }
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
          @page {
            size: portrait;
            margin: 0.5cm;
          }
          .print-only { font-size: 9px; }
          .print-only h1 { font-size: 16px; margin-bottom: 0.5rem; }
          .print-only h3 { font-size: 6px; }
          .print-only table th, .print-only table td { padding-top: 2px !important; padding-bottom: 2px !important; }
        }
      `}</style>
      {/* VISIBILITY CONTROL */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Visibilité des bulletins par classe</h3>
        <div className="flex gap-2 mb-4">
            <button
                onClick={() => handleBulkToggle(true)}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 transition"
            >
                Afficher tous
            </button>
            <button
                onClick={() => handleBulkToggle(false)}
                className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-100 hover:bg-slate-100 transition"
            >
                Masquer tous
            </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {classList.map((c) => (
            <button
              key={c.id}
              onClick={() => handleToggleVisibility(c.id, c.reportCardsVisible)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                c.reportCardsVisible 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-60'
              }`}
            >
              {c.reportCardsVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end print:hidden">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Élève</label>
          <select 
            className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-500/20"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="">Sélectionner un élève</option>
            {students.map((s) => (
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
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.schoolYear ? ` (${s.schoolYear})` : ''}</option>
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
             <h2 className="text-xl font-bold text-slate-900">Récapitulatif des Moyennes</h2>
             <p className="text-sm text-slate-500 mt-1">Vérifiez les résultats avant de valider le bulletin.</p>
          </div>

          <div className="p-8 grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              {averages.map((a, index) => (
                <div key={a.subjectId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                        <div className="font-bold text-slate-700">{a.subjectName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{a.teacherNames}</div>
                    </div>
                    <span className="text-lg font-black text-blue-600">
                        {a.isDispensed ? <span className="text-slate-400 italic font-medium">Dispensé</span> : (a.average !== null ? a.average.toFixed(2) : '—')}
                        {!a.isDispensed && a.average !== null && <span className="text-[10px] text-slate-400 ml-1">/20</span>}
                    </span>
                  </div>
                  <textarea 
                    className="w-full rounded-xl border-slate-200 text-xs p-2"
                    placeholder="Commentaire..."
                    value={a.comments}
                    onChange={(e) => {
                        const newAverages = [...averages];
                        newAverages[index].comments = e.target.value;
                        setAverages(newAverages);
                    }}
                  />
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
        </div>
      )}

      {/* Print Only Section */}
      <div className="print-only hidden print:block bg-white p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 break-inside-avoid">
            <div className="flex items-center gap-4">
              <img src="/ECMA - Logo noir.png" alt="Logo Établissement" className="h-16 w-auto" />
              <div>
                <h1 className="text-3xl font-black text-slate-900">BULLETIN SCOLAIRE</h1>
                <p className="text-lg text-slate-500 mt-1">{semesters.find((s) => s.id === selectedSemester)?.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">ECM Academie</p>
              <p className="text-xs text-slate-500">Portail Académique</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-8 break-inside-avoid">
            <div>
               <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Élève</h3>
               <p className="text-xl font-black text-slate-900">{students.find((s) => s.id === selectedStudent)?.name}</p>
               <p className="text-slate-500 font-medium text-sm">Classe : {students.find((s) => s.id === selectedStudent)?.className}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right">
                 <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Moy. Élève</h3>
                 <p className="text-3xl font-black text-blue-600">
                   {(() => {
                     const graded = averages.filter((a) => a.average !== null);
                     if (graded.length === 0) return '—';
                     const total = graded.reduce((acc: number, cur) => acc + (cur.average ?? 0), 0);
                     return (total / graded.length).toFixed(1);
                   })()}
                 </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right">
                 <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Moy. Classe</h3>
                 <p className="text-3xl font-black text-slate-900">
                   {(() => {
                     const graded = averages.filter((a) => a.classAverage !== null);
                     if (graded.length === 0) return '—';
                     const total = graded.reduce((acc: number, cur) => acc + (cur.classAverage ?? 0), 0);
                     return (total / graded.length).toFixed(1);
                   })()}
                 </p>
              </div>
            </div>
          </section>

          <section className="break-inside-avoid">
             <table className="w-full border-collapse text-sm">
               <thead>
                 <tr className="border-b-2 border-slate-900">
                   <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-900">Matière</th>
                   <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Moy. Élève</th>
                   <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Moy. Classe</th>
                   <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Appréciation</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {averages.map((a) => (
                   <tr key={a.subjectId} className="break-inside-avoid">
                     <td className="py-4">
                        <div className="font-bold text-slate-900">{a.subjectName}</div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest">{a.teacherNames}</div>
                     </td>
                     <td className="py-4 text-right font-black text-blue-600">
                       {a.average !== null ? a.average.toFixed(1) : '—'}
                     </td>
                     <td className="py-4 text-right font-bold text-slate-500">
                       {a.classAverage !== null ? a.classAverage.toFixed(1) : '—'}
                     </td>
                     <td className="py-4 text-right text-slate-500 italic text-xs max-w-xs">
                       {a.comments || "—"}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </section>

          <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg break-inside-avoid">
             <h3 className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2">Bilan de l&apos;établissement</h3>
             <p className="text-base font-medium leading-relaxed">&quot;{appraisal}&quot;</p>
             {distinction && (
               <div className="mt-4 pt-4 border-t border-white/10">
                 <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Mention : {distinction}</p>
               </div>
             )}
          </section>

          <footer className="pt-8 flex justify-between items-end border-t border-slate-100 break-inside-avoid">
             <div className="text-[10px] text-slate-400">
               Document généré le {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}
             </div>
             <div className="text-center w-48">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-8">Cachet et Signature</p>
               <div className="h-px w-full bg-slate-300"></div>
             </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
