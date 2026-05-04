"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LivretBody from '@/components/livret/livret-body';
import { updateSkillLevel, addCompetency } from './actions';

export default function ProfLivretClient({ students, initialEvaluations, selectedStudentId, category }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onUpdate = (compName: string, level: number) => {
    startTransition(async () => {
      await updateSkillLevel(selectedStudentId, compName, level, category);
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Choisir un élève</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {students.map((s: any) => (
            <button
              key={s.id}
              onClick={() => router.push(`/${category === 'SCHOOL' ? 'prof' : 'employer'}/livret?studentId=${s.id}`)}
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
          competencies={initialEvaluations} 
          isEditable={true}
          onUpdate={(id, level) => {
            const comp = initialEvaluations.find((e: any) => e.id === id);
            if (comp) onUpdate(comp.name, level);
          }}
        />
      </div>
    </div>
  );
}
