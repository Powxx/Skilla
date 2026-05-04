"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';

type Competency = {
  id: string;
  name: string;
  level: number; // 1, 2, 3
  lastUpdated: string;
};

type Props = {
  studentName: string;
  competencies: Competency[];
  isEditable?: boolean;
  onUpdate?: (id: string, newLevel: number) => void;
};

const STATUS_MAP: Record<number, { label: string, color: string, bg: string }> = {
  1: { label: "Non acquis", color: "text-red-700", bg: "bg-red-50 border-red-100" },
  2: { label: "En cours d'acquisition", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  3: { label: "Acquis", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" }
};

export default function LivretBody({ studentName, competencies, isEditable, onUpdate }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Livret d'Apprentissage</h2>
          <p className="text-sm text-slate-500 font-medium">Suivi des compétences pour {studentName}</p>
        </div>
        <div className="text-right hidden sm:block">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dernière mise à jour : {format(new Date(), 'dd/MM/yyyy')}</span>
        </div>
      </header>

      <div className="grid gap-4">
        {competencies.map((c) => {
          const status = STATUS_MAP[c.level] || { label: "Inconnu", color: "text-slate-400", bg: "bg-slate-50 border-slate-100" };
          
          return (
            <div key={c.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 text-lg">{c.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.color}`}>
                     {status.label}
                   </span>
                </div>
              </div>

              {isEditable ? (
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                   {[1, 2, 3].map((l) => (
                     <button
                       key={l}
                       onClick={() => onUpdate?.(c.id, l)}
                       className={`h-10 px-4 rounded-xl text-xs font-bold transition ${c.level === l ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}
                     >
                       {STATUS_MAP[l].label.split(' ')[0]}
                     </button>
                   ))}
                </div>
              ) : (
                <div className="w-full md:w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${c.level === 3 ? 'bg-emerald-500' : c.level === 2 ? 'bg-amber-500' : 'bg-red-500'}`} 
                     style={{ width: `${(c.level / 3) * 100}%` }}
                   ></div>
                </div>
              )}
            </div>
          );
        })}

        {competencies.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
             <p className="text-slate-400 italic">Aucune compétence définie pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
