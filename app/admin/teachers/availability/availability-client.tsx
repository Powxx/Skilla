"use client";

import React, { useState, useTransition } from 'react';
import { addTeacherAvailability, deleteTeacherAvailability } from './actions';
import { Trash2, Plus, Clock } from 'lucide-react';

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function TeacherAvailabilityClient({ teachers, initialAvailabilities }: any) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ teacherId: '', dayOfWeek: 1, startTime: '08:00', endTime: '17:00' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherId) return;
    startTransition(async () => {
      await addTeacherAvailability(form.teacherId, form.dayOfWeek, form.startTime, form.endTime);
    });
  };

  return (
    <div className="space-y-12">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid gap-6 md:grid-cols-5 items-end">
        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">1. Professeur</label>
          <select 
            className="w-full rounded-2xl border-slate-200 text-sm font-bold h-12 focus:ring-slate-900"
            value={form.teacherId}
            onChange={e => setForm({...form, teacherId: e.target.value})}
          >
            <option value="">Sélectionner...</option>
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">2. Jour</label>
          <select 
            className="w-full rounded-2xl border-slate-200 text-sm font-bold h-12 focus:ring-slate-900"
            value={form.dayOfWeek}
            onChange={e => setForm({...form, dayOfWeek: parseInt(e.target.value)})}
          >
            {[1,2,3,4,5,6,0].map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
           <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Début</label>
              <input 
                type="time" 
                className="w-full rounded-2xl border-slate-200 text-sm font-bold h-12 focus:ring-slate-900"
                value={form.startTime}
                onChange={e => setForm({...form, startTime: e.target.value})}
              />
           </div>
           <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Fin</label>
              <input 
                type="time" 
                className="w-full rounded-2xl border-slate-200 text-sm font-bold h-12 focus:ring-slate-900"
                value={form.endTime}
                onChange={e => setForm({...form, endTime: e.target.value})}
              />
           </div>
        </div>
        <button 
          disabled={isPending}
          className="bg-slate-900 text-white h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {isPending ? "Ajout..." : "Ajouter"}
        </button>
      </form>

      <div className="grid gap-6 md:grid-cols-2">
         {teachers.map((teacher: any) => {
            const teacherAvails = initialAvailabilities.filter((a: any) => a.teacherId === teacher.id);
            if (teacherAvails.length === 0) return null;

            return (
               <div key={teacher.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 bg-slate-50 border-b border-slate-100">
                     <h3 className="font-black text-slate-900 uppercase tracking-tight">{teacher.lastName} {teacher.firstName}</h3>
                  </div>
                  <div className="p-6 space-y-3 flex-1">
                     {teacherAvails.map((avail: any) => (
                        <div key={avail.id} className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-100 group hover:border-blue-200 transition-colors shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                 <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-900 uppercase">{DAYS[avail.dayOfWeek]}</p>
                                 <p className="text-[10px] font-bold text-slate-400">{avail.startTime} — {avail.endTime}</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => startTransition(() => deleteTeacherAvailability(avail.id))}
                             className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
}
