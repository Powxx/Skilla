"use client";

import React, { useState, useTransition } from 'react';
import { updateClassRequirement } from './actions';
import { Save, Clock, BookOpen, ChevronRight } from 'lucide-react';

export default function RequirementsClient({ initialClasses, initialSubjects, initialRequirements }: any) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialRequirements.forEach((r: any) => {
      map[`${r.classId}-${r.subjectId}`] = r.weeklyHours;
    });
    return map;
  });

  const handleUpdate = (classId: string, subjectId: string, hours: number) => {
    setValues(prev => ({ ...prev, [`${classId}-${subjectId}`]: hours }));
    startTransition(async () => {
      await updateClassRequirement(classId, subjectId, hours);
    });
  };

  return (
    <div className="space-y-12">
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {initialClasses.map((cls: any) => (
          <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:border-blue-100 transition-all duration-500">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-black uppercase tracking-widest">{cls.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Quotas Hebdomadaires</p>
               </div>
               <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-400" />
               </div>
            </div>
            
            <div className="p-6 space-y-4 flex-1">
               {initialSubjects.map((sub: any) => {
                  const key = `${cls.id}-${sub.id}`;
                  const currentVal = values[key] || 0;
                  
                  return (
                    <div key={sub.id} className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                             <BookOpen className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight line-clamp-1">{sub.name}</span>
                       </div>
                       
                       <div className="flex items-center gap-2 shrink-0">
                          <input 
                            type="number" 
                            step="0.5"
                            min="0"
                            className="w-16 h-9 rounded-xl border-slate-200 text-center text-xs font-black focus:ring-slate-900 bg-white"
                            value={currentVal}
                            onChange={e => handleUpdate(cls.id, sub.id, parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">H</span>
                       </div>
                    </div>
                  );
               })}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
               <p className="text-[10px] font-black text-slate-400 uppercase">Total: {initialSubjects.reduce((acc: number, sub: any) => acc + (values[`${cls.id}-${sub.id}`] || 0), 0)}h</p>
               {isPending && <RotateCw className="h-3 w-3 animate-spin text-blue-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RotateCw({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
