"use client";

import React, { useState } from 'react';

const STATUS_MAP: Record<number, { label: string, color: string, bg: string }> = {
  1: { label: "Non acquis", color: "text-red-700", bg: "bg-red-50 border-red-100" },
  2: { label: "En cours", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  3: { label: "Acquis", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" }
};

export default function AdminCompetenciesRecapClient({ initialClasses, studentsData }: any) {
  const [selectedClassId, setSelectedClassId] = useState(initialClasses[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState<'SCHOOL' | 'ENTERPRISE'>('SCHOOL');

  const filteredStudents = studentsData.filter((s: any) => s.classId === selectedClassId);
  const selectedClass = initialClasses.find((c: any) => c.id === selectedClassId);
  const classCompetencies = selectedClass?.competencies?.filter((cc: any) => cc.category === activeCategory) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex gap-4">
          <select 
            className="rounded-xl border-slate-200 text-sm font-bold pr-10"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {initialClasses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveCategory('SCHOOL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeCategory === 'SCHOOL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              École
            </button>
            <button
              onClick={() => setActiveCategory('ENTERPRISE')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeCategory === 'ENTERPRISE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Entreprise
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-500 font-medium">
          {filteredStudents.length} élèves • {classCompetencies.length} compétences
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white uppercase tracking-widest">
                <th className="px-6 py-4 font-black sticky left-0 bg-slate-900 z-10">Élève</th>
                {classCompetencies.map((cc: any) => (
                  <th key={cc.id} className="px-6 py-4 font-black text-center min-w-[120px]">{cc.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                    {s.lastName} {s.firstName}
                  </td>
                  {classCompetencies.map((cc: any) => {
                    const evalData = s.evaluations.find((e: any) => e.competency === cc.name && e.category === activeCategory);
                    const level = evalData?.level || 1;
                    const status = STATUS_MAP[level];

                    return (
                      <td key={cc.id} className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight border ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    );
                  })}
                  {classCompetencies.length === 0 && (
                    <td className="px-6 py-10 text-center text-slate-400 italic" colSpan={1}>
                      Aucune compétence définie pour cette catégorie.
                    </td>
                  )}
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td className="px-6 py-20 text-center text-slate-400 italic" colSpan={classCompetencies.length + 1}>
                    Aucun élève dans cette classe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
