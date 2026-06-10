"use client";

import React, { useState, useTransition } from 'react';
import { updateClassRequirement, deleteClassRequirement } from './actions';
import { Trash2, Save, Plus } from 'lucide-react';

export default function RequirementsClient({ initialClasses, initialSubjects, initialRequirements }: any) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ classId: '', subjectId: '', weeklyHours: 4 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId || !form.subjectId) return;
    startTransition(async () => {
      await updateClassRequirement(form.classId, form.subjectId, form.weeklyHours);
      setForm({ ...form, subjectId: '' });
    });
  };

  return (
    <div className="space-y-12">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid gap-6 md:grid-cols-4 items-end">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">1. Classe</label>
          <select 
            className="w-full rounded-2xl border-slate-200 text-sm font-bold h-12 focus:ring-slate-900"
            value={form.classId}
            onChange={e => setForm({...form, classId: e.target.value})}
          >
            <option value="">Sélectionner...</option>
            {initialClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">2. Matière</label>
          <select 
            className="w-full rounded-2xl border-slate-200 text-sm font-bold h-12 focus:ring-slate-900"
            value={form.subjectId}
            onChange={e => setForm({...form, subjectId: e.target.value})}
          >
            <option value="">Sélectionner...</option>
            {initialSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">3. Heures / Semaine</label>
          <input 
            type="number" 
            step="0.5"
            className="w-full rounded-2xl border-slate-200 text-sm font-bold h-12 focus:ring-slate-900"
            value={form.weeklyHours}
            onChange={e => setForm({...form, weeklyHours: parseFloat(e.target.value)})}
          />
        </div>
        <button 
          disabled={isPending}
          className="bg-slate-900 text-white h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {isPending ? "Enregistrement..." : "Définir Quota"}
        </button>
      </form>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Classe</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Matière</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Volume</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {initialRequirements.map((req: any) => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5 font-black text-slate-900 text-sm">{req.class.name}</td>
                <td className="px-8 py-5">
                   <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600">
                      {req.subject.name}
                   </span>
                </td>
                <td className="px-8 py-5 text-center">
                   <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {req.weeklyHours}h
                   </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => startTransition(() => deleteClassRequirement(req.id))}
                    className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Supprimer ce quota"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            {initialRequirements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                  Aucun quota défini. L'IA utilisera 4h par défaut pour toutes les matières.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
