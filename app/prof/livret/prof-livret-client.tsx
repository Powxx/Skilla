"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LivretBody from '@/components/livret/livret-body';
import { updateSkillLevel, addCompetency } from './actions';

export default function ProfLivretClient({ students, initialEvaluations, selectedStudentId }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newComp, setNewComp] = useState('');

  const onUpdate = (compName: string, level: number) => {
    startTransition(async () => {
      await updateSkillLevel(selectedStudentId, compName, level);
    });
  };

  const handleAdd = () => {
    if (!newComp.trim()) return;
    startTransition(async () => {
      await addCompetency(selectedStudentId, newComp.trim());
      setNewComp('');
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
              onClick={() => router.push(`/prof/livret?studentId=${s.id}`)}
              className={`w-full text-left p-4 rounded-2xl border transition ${selectedStudentId === s.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
            >
              <div className="font-bold text-sm">{s.name}</div>
              <div className={`text-[10px] mt-1 ${selectedStudentId === s.id ? 'text-slate-400' : 'text-slate-400'}`}>{s.className}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 space-y-8">
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row gap-6 justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Ajouter une compétence</h3>
            <p className="text-sm text-slate-400 mt-1">Définissez un nouvel axe d'évaluation pour cet élève.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <input 
               type="text" 
               className="rounded-xl border-none bg-white/10 text-white placeholder:text-white/30 text-sm focus:ring-white/20 w-full md:w-64"
               placeholder="Nom de la compétence..."
               value={newComp}
               onChange={(e) => setNewComp(e.target.value)}
             />
             <button 
               onClick={handleAdd}
               disabled={isPending || !newComp.trim()}
               className="bg-white text-slate-900 px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 transition disabled:opacity-50"
             >
               Ajouter
             </button>
          </div>
        </div>

        <LivretBody 
          studentName={students.find((s: any) => s.id === selectedStudentId)?.name || "L'élève"}
          competencies={initialEvaluations.map((e: any) => ({ ...e, name: e.name }))} // the name is already in the object
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
