"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LivretBody from '@/components/livret/livret-body';
import { updateSkillLevel, addCompetency } from './actions';

export default function ProfLivretClient({ students, initialEvaluations, selectedStudentId, selectedSemesterId, semesters, category }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [evaluations, setEvaluations] = useState(initialEvaluations);

  // Sync with props when navigation happens
  useEffect(() => {
    setEvaluations(initialEvaluations);
  }, [initialEvaluations]);

  const onUpdate = (compName: string, level: number) => {
    // Optimistic update
    const previousEvaluations = [...evaluations];
    setEvaluations(evaluations.map((e: any) => 
      e.name === compName ? { ...e, level } : e
    ));

    startTransition(async () => {
      try {
        await updateSkillLevel(selectedStudentId, compName, level, category, selectedSemesterId);
      } catch (error) {
        // Rollback on error
        setEvaluations(previousEvaluations);
        alert("Erreur lors de la mise à jour");
      }
    });
  };

  const handleNavigation = (studentId: string, semesterId: string) => {
    router.push(`/${category === 'SCHOOL' ? 'prof' : 'employer'}/livret?studentId=${studentId}&semesterId=${semesterId}`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Configuration</h3>
        <select
            className="w-full rounded-xl border-slate-200 text-sm p-3"
            value={selectedSemesterId}
            onChange={(e) => handleNavigation(selectedStudentId, e.target.value)}
        >
            {semesters.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-4">Choisir un élève</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {students.map((s: any) => (
            <button
              key={s.id}
              onClick={() => handleNavigation(s.id, selectedSemesterId)}
              className={`w-full text-left p-4 rounded-2xl border transition ${selectedStudentId === s.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
            >
              <div className="font-bold text-sm">{s.name}</div>
              <div className={`text-[10px] mt-1 ${selectedStudentId === s.id ? 'text-slate-400' : 'text-slate-400'}`}>{s.className}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 space-y-8">
        <LivretBody 
          studentName={students.find((s: any) => s.id === selectedStudentId)?.name || "L'élève"}
          competencies={evaluations} 
          isEditable={true}
          onUpdate={(id, level) => {
            const comp = evaluations.find((e: any) => e.id === id);
            if (comp) onUpdate(comp.name, level);
          }}
        />
      </div>
    </div>
  );
}
