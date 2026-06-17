"use client";

import React from 'react';
import { format } from 'date-fns';

// Ajout du type catégorie pour le tableau
type Competency = {
  id: string;
  name: string;
  level: number; // 1, 2, 3
  category: string; // Autoriser string pour éviter les conflits de types
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
  2: { label: "En cours", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  3: { label: "Acquis", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" }
};

export default function LivretBody({ studentName, competencies, isEditable, onUpdate }: Props) {
  // Grouper les compétences par nom pour le tableau comparatif
  const competencyGroups = competencies.reduce((acc, c) => {
    if (!acc[c.name]) acc[c.name] = { id: c.name, SCHOOL: null, ENTERPRISE: null };
    (acc[c.name] as any)[c.category] = c.level;
    return acc;
  }, {} as Record<string, { id: string, SCHOOL: number | null, ENTERPRISE: number | null }>);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: portrait; margin: 1cm; }
          body { font-size: 10px; }
          .break-avoid { break-inside: avoid; }
        }
      `}</style>

      <header className="flex justify-between items-end no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Livret d'Apprentissage</h2>
          <p className="text-sm text-slate-500 font-medium">Suivi des compétences pour {studentName}</p>
        </div>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold">Imprimer</button>
      </header>

      {/* Vue écran */}
      <div className="grid gap-4 no-print">
        {competencies.map((c) => {
          const status = STATUS_MAP[c.level] || { label: "Inconnu", color: "text-slate-400", bg: "bg-slate-50 border-slate-100" };
          return (
            <div key={c.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 text-lg">{c.name} <span className="text-[10px] text-slate-400">({c.category})</span></h4>
                <div className="flex items-center gap-2 mt-2">
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.color}`}>
                     {status.label}
                   </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vue Impression */}
      <div className="hidden print:block print-only">
        <div className="break-avoid">
          <header className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-black text-slate-900">LIVRET D'APPRENTISSAGE</h1>
              <p className="text-xs text-slate-500 mt-1">Élève : <span className="font-bold text-slate-900">{studentName}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">ECM Academie</p>
              <p className="text-[9px] text-slate-500">Portail Académique</p>
            </div>
          </header>
        </div>

        <table className="w-full border-collapse border border-slate-300 text-[10px] break-avoid">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left">Compétence</th>
              <th className="border p-2 text-center w-24">École</th>
              <th className="border p-2 text-center w-24">Entreprise</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(competencyGroups).map(([name, data]) => (
              <tr key={name}>
                <td className="border p-2 font-bold">{name}</td>
                <td className="border p-2 text-center">{data.SCHOOL ? STATUS_MAP[data.SCHOOL].label : '-'}</td>
                <td className="border p-2 text-center">{data.ENTERPRISE ? STATUS_MAP[data.ENTERPRISE].label : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-8 pt-4 border-t text-right text-[9px] text-slate-400 break-avoid">
           Document généré le {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>
    </div>
  );
}
