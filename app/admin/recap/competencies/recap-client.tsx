"use client";

import React, { useState } from 'react';

const STATUS_MAP: Record<number, { label: string, color: string, bg: string }> = {
  1: { label: "Non acquis", color: "text-red-700", bg: "bg-red-50 border-red-100" },
  2: { label: "En cours", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  3: { label: "Acquis", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" }
};

export default function AdminCompetenciesRecapClient({ initialClasses, studentsData, semesters }: any) {
  const [selectedClassId, setSelectedClassId] = useState(initialClasses[0]?.id || '');
  const [selectedSemesterId, setSelectedSemesterId] = useState(semesters[0]?.id || '');

  const filteredStudents = studentsData.filter((s: any) => s.classId === selectedClassId);
  const selectedClass = initialClasses.find((c: any) => c.id === selectedClassId);
  
  // Get unique competency names (since they are created in pairs now)
  const uniqueCompNames = Array.from(new Set((selectedClass?.competencies || []).map((cc: any) => cc.name)));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Classe</label>
            <select 
              className="rounded-xl border-slate-200 text-sm font-bold pr-10 focus:ring-slate-900 focus:border-slate-900"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {initialClasses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Semestre</label>
            <select 
              className="rounded-xl border-slate-200 text-sm font-bold pr-10 focus:ring-slate-900 focus:border-slate-900"
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
            >
              {semesters.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}{s.schoolYear?.name ? ` (${s.schoolYear.name})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-right">
           <p className="text-sm text-slate-900 font-bold">{filteredStudents.length} élèves inscrits</p>
           <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{uniqueCompNames.length} compétences suivies</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white uppercase tracking-widest">
                <th className="px-6 py-4 font-black sticky left-0 bg-slate-900 z-20 border-r border-slate-800">Élève</th>
                {uniqueCompNames.map((name: any) => (
                  <th key={name as string} className="px-6 py-4 font-black text-center min-w-[240px] border-l border-slate-800">
                    <div className="text-[11px] mb-1">{name as string}</div>
                    <div className="flex gap-1 justify-center">
                       <span className="text-[8px] px-1 bg-blue-500 rounded text-white">ÉCOLE</span>
                       <span className="text-[8px] px-1 bg-amber-500 rounded text-white">ENTREPRISE</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition group">
                  <td className="px-6 py-6 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200">
                    {s.lastName} {s.firstName}
                  </td>
                  {uniqueCompNames.map((name: any) => {
                    const evalSchool = s.evaluations.find((e: any) => e.competency === name && e.category === 'SCHOOL');
                    const evalEnt = s.evaluations.find((e: any) => e.competency === name && e.category === 'ENTERPRISE');
                    
                    const statusSchool = STATUS_MAP[evalSchool?.level || 1];
                    const statusEnt = STATUS_MAP[evalEnt?.level || 1];

                    return (
                      <td key={name as string} className="px-4 py-4 border-l border-slate-100">
                        <div className="flex items-center justify-center gap-2">
                           {/* School Level */}
                           <div className="flex-1 flex flex-col items-center gap-1">
                              <span className={`w-full text-center py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border ${statusSchool.bg} ${statusSchool.color}`}>
                                {statusSchool.label.split(' ')[0]}
                              </span>
                           </div>
                           
                           <div className="w-[1px] h-6 bg-slate-200"></div>

                           {/* Enterprise Level */}
                           <div className="flex-1 flex flex-col items-center gap-1">
                              <span className={`w-full text-center py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border ${statusEnt.bg} ${statusEnt.color}`}>
                                {statusEnt.label.split(' ')[0]}
                              </span>
                           </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td className="px-6 py-20 text-center text-slate-400 italic" colSpan={uniqueCompNames.length + 1}>
                    Aucun élève dans cette classe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
             <span>Non acquis</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
             <span>En cours</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
             <span>Acquis</span>
          </div>
      </div>
    </div>
  );
}
