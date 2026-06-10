"use client";

import React, { useState, useTransition, useMemo } from 'react';
import { addTeacherAvailability, deleteTeacherAvailability } from './actions';
import { Trash2, Plus, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h to 19h

export default function TeacherAvailabilityClient({ teachers, initialAvailabilities }: any) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [isPending, startTransition] = useTransition();

  const teacherAvailabilities = useMemo(() => {
    return initialAvailabilities.filter((a: any) => a.teacherId === selectedTeacherId);
  }, [initialAvailabilities, selectedTeacherId]);

  const toggleSlot = (dayOfWeek: number, hour: number) => {
    if (!selectedTeacherId) return;

    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    const existing = teacherAvailabilities.find((a: any) => 
      a.dayOfWeek === dayOfWeek && a.startTime === startTime
    );

    startTransition(async () => {
      if (existing) {
        await deleteTeacherAvailability(existing.id);
      } else {
        await addTeacherAvailability(selectedTeacherId, dayOfWeek, startTime, endTime);
      }
    });
  };

  const isSlotSelected = (dayOfWeek: number, hour: number) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    return teacherAvailabilities.some((a: any) => a.dayOfWeek === dayOfWeek && a.startTime === startTime);
  };

  return (
    <div className="space-y-8">
      {/* Teacher Selector */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200">
               <Clock className="h-6 w-6" />
            </div>
            <div>
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Planning de Disponibilité</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliquez sur les cases pour définir les créneaux</p>
            </div>
         </div>

         <select 
           className="w-full md:w-64 h-12 rounded-2xl border-slate-200 text-sm font-black focus:ring-slate-900 bg-slate-50"
           value={selectedTeacherId}
           onChange={e => setSelectedTeacherId(e.target.value)}
         >
           <option value="" disabled>Sélectionner un professeur</option>
           {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
         </select>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
         <div className="grid grid-cols-8 border-b border-slate-100">
            <div className="p-4 bg-slate-50 border-r border-slate-100"></div>
            {[1,2,3,4,5,6].map(d => (
               <div key={d} className="p-4 text-center bg-slate-50 border-r border-slate-100 last:border-r-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{DAYS[d].substring(0, 3)}</p>
               </div>
            ))}
         </div>

         <div className="relative">
            {HOURS.map(hour => (
               <div key={hour} className="grid grid-cols-8 border-b border-slate-50 last:border-b-0 group">
                  <div className="p-4 text-right pr-6 bg-slate-50/50 border-r border-slate-100 flex items-center justify-end">
                     <span className="text-[10px] font-black text-slate-400 uppercase">{hour}h</span>
                  </div>
                  {[1,2,3,4,5,6].map(day => {
                     const selected = isSlotSelected(day, hour);
                     return (
                        <div 
                          key={day} 
                          onClick={() => toggleSlot(day, hour)}
                          className={`
                            h-16 border-r border-slate-50 last:border-r-0 cursor-pointer transition-all relative flex items-center justify-center
                            ${selected ? 'bg-blue-600 shadow-inner' : 'hover:bg-blue-50'}
                          `}
                        >
                           {selected && (
                              <div className="animate-in zoom-in-50 duration-300">
                                 <Check className="h-5 w-5 text-white stroke-[4px]" />
                              </div>
                           )}
                           {isPending && !selected && <div className="absolute inset-0 bg-white/50 animate-pulse" />}
                        </div>
                     );
                  })}
               </div>
            ))}
         </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 items-center bg-slate-900 p-6 rounded-[2rem] text-white">
         <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-md bg-blue-600"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Disponible</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-md bg-white/10 border border-white/20"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Indisponible</span>
         </div>
         {isPending && (
            <div className="flex items-center gap-2 text-blue-400">
               <RotateCw className="h-4 w-4 animate-spin" />
               <span className="text-[10px] font-black uppercase tracking-widest">Mise à jour...</span>
            </div>
         )}
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
