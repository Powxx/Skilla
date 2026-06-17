"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function AdminSubstitutionsClient({ initialRequests, teachers, allSubjects }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<any>(null); // current request being assigned
  const [subTeacherId, setSubTeacherId] = useState('');
  const [subSubjectId, setSubSubjectId] = useState('');

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    if (status === "APPROVED" && (!subTeacherId || !subSubjectId)) {
       alert("Veuillez sélectionner un professeur et une matière.");
       return;
    }
    
    setLoading(id);
    try {
      const res = await fetch("/api/substitutions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          status, 
          substituteTeacherId: subTeacherId || undefined,
          subjectId: subSubjectId || undefined
        })
      });
      if (res.ok) {
        setAssigning(null);
        setSubTeacherId('');
        setSubSubjectId('');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const selectedTeacher = teachers.find((t: any) => t.id === subTeacherId);
  const availableSubjects = selectedTeacher?.subjects || allSubjects;

  return (
    <div className="space-y-4">
      {initialRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          Aucune demande de remplacement pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Cours</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Demandeur</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialRequests.map((req: any) => (
                <React.Fragment key={req.id}>
                  <tr className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {req.lesson.isFreeLesson ? (req.lesson.customSubject || "Cours libre") : (req.lesson.subject?.name || "Sans matière")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {format(new Date(req.lesson.startTime), 'EEEE d MMMM HH:mm', { locale: fr })}
                      </div>
                      <div className="text-xs text-slate-400">Classe : {req.lesson.class.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">
                        {req.originalTeacher.lastName} {req.originalTeacher.firstName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        req.status === 'PENDING' ? 'bg-orange-100 text-orange-800' :
                        req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status === 'PENDING' ? 'En attente' : req.status === 'APPROVED' ? 'Remplacé' : 'Refusé'}
                      </span>
                      {req.status === 'APPROVED' && req.substituteTeacher && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          Par {req.substituteTeacher.lastName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'PENDING' && !assigning && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAction(req.id, "REJECTED")}
                            disabled={!!loading}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Refuser
                          </button>
                          <button
                            onClick={() => {
                              setAssigning(req);
                              setSubSubjectId(req.lesson.subjectId);
                            }}
                            disabled={!!loading}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
                          >
                            Assigner
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {assigning?.id === req.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={4} className="px-6 py-6 border-b border-blue-100">
                        <div className="flex flex-wrap gap-4 items-end">
                           <div className="flex-1 min-w-[200px]">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Remplaçant</label>
                              <select 
                                className="w-full text-sm rounded-xl border-slate-200"
                                value={subTeacherId}
                                onChange={e => setSubTeacherId(e.target.value)}
                              >
                                <option value="">-- Choisir un professeur --</option>
                                {teachers.filter((t: any) => t.id !== req.originalTeacherId).map((t: any) => (
                                  <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
                                ))}
                              </select>
                           </div>
                           <div className="flex-1 min-w-[200px]">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Matière enseignée</label>
                              <select 
                                className="w-full text-sm rounded-xl border-slate-200"
                                value={subSubjectId}
                                onChange={e => setSubSubjectId(e.target.value)}
                              >
                                {availableSubjects.map((s: any) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                           </div>
                           <div className="flex gap-2">
                             <button onClick={() => setAssigning(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                             <button 
                               onClick={() => handleAction(req.id, "APPROVED")}
                               disabled={!subTeacherId || !!loading}
                               className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                             >
                               {loading ? "En cours..." : "Confirmer le remplacement"}
                             </button>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
