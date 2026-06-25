"use client";

import React, { useState } from 'react';
import { format, isBefore, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function HRTeachersClient({ initialTeachers }: { initialTeachers: any[] }) {
  const router = useRouter();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeachers[0]?.id || "");
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedTeacher = initialTeachers.find(t => t.id === selectedTeacherId);
  const [contractForm, setContractForm] = useState({
    annualHours: selectedTeacher?.contract?.annualHours || 0
  });

  const handleTeacherChange = (id: string) => {
    setSelectedTeacherId(id);
    const teacher = initialTeachers.find(t => t.id === id);
    setContractForm({
      annualHours: teacher?.contract?.annualHours || 0
    });
    setIsEditingContract(false);
  };

  const handleSaveContract = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          ...contractForm
        })
      });
      if (res.ok) {
        setIsEditingContract(false);
        router.refresh();
      } else {
        alert("Erreur lors de l'enregistrement");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedTeacher) return <div>Aucun professeur trouvé.</div>;

  // Calculate Stats
  const now = new Date();
  const monthLessons = selectedTeacher.lessons || [];
  
  const realizedLessons = monthLessons.filter((l: any) => !l.isCancelled && isBefore(new Date(l.endTime), now));
  const plannedLessons = monthLessons.filter((l: any) => !l.isCancelled && !isBefore(new Date(l.endTime), now));
  
  const realizedHours = realizedLessons.reduce((acc: number, l: any) => {
    return acc + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / (1000 * 60 * 60);
  }, 0);

  const plannedHours = plannedLessons.reduce((acc: number, l: any) => {
    return acc + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / (1000 * 60 * 60);
  }, 0);

  const totalMonthHours = realizedHours + plannedHours;
  const expectedAnnualHours = selectedTeacher.contract?.annualHours || 0;

  // Weekly breakdown for graph
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLessons = monthLessons.filter((l: any) => !l.isCancelled && format(new Date(l.startTime), 'yyyy-MM-dd') === dayStr);
    const hours = dayLessons.reduce((acc: number, l: any) => {
      return acc + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / (1000 * 60 * 60);
    }, 0);
    return { day: format(day, 'EEE', { locale: fr }), hours };
  });

  const maxHours = Math.max(...weeklyData.map(d => d.hours), 8);

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      {/* Sidebar: Teacher Selection */}
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
          <label className="block text-sm font-medium text-slate-700 mb-2">Sélectionner un professeur</label>
          <select 
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedTeacherId}
            onChange={(e) => handleTeacherChange(e.target.value)}
          >
            {initialTeachers.map(t => (
              <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
            ))}
          </select>
        </div>

        {/* Contract Info Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Contrat</h3>
            <button 
              onClick={() => setIsEditingContract(!isEditingContract)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {isEditingContract ? "Annuler" : "Modifier"}
            </button>
          </div>
          
          {isEditingContract ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Heures mensuelles prévues</label>
                <input 
                  type="number" 
                  className="w-full rounded-lg border-slate-300 text-sm"
                  value={contractForm.annualHours}
                  onChange={e => setContractForm({...contractForm, annualHours: parseFloat(e.target.value)})}
                />
              </div>
              <button 
                onClick={handleSaveContract}
                disabled={loading}
                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Heures prévues</span>
                <span className="text-sm font-medium text-slate-900">{expectedAnnualHours}h/an</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Stats & Graphs */}
      <div className="lg:col-span-3 space-y-8">
        {/* Top Summary Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Heures réalisées (ce mois)</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{realizedHours.toFixed(1)}h</div>
            <div className="mt-1 text-xs text-slate-400">Cours passés uniquement</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="text-sm font-medium text-slate-500">Total projeté (fin de mois)</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{totalMonthHours.toFixed(1)}h</div>
            <div className="mt-1 flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${totalMonthHours > expectedAnnualHours ? 'bg-orange-500' : 'bg-green-500'}`}></div>
              <span className="text-xs text-slate-500">Contrat : {expectedAnnualHours}h/an</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04] bg-blue-50/30">
            <div className="text-sm font-medium text-blue-600">Statut du contrat</div>
            <div className="mt-2 text-2xl font-semibold text-blue-700">
              {totalMonthHours >= expectedAnnualHours ? 'Objectif atteint' : `${(expectedAnnualHours - totalMonthHours).toFixed(1)}h restantes`}
            </div>
            <div className="mt-1 text-xs text-blue-400">Basé sur le total projeté</div>
          </div>
        </div>

        {/* Weekly Activity Graph */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h3 className="font-semibold text-slate-900 mb-6 text-lg">Activité hebdomadaire (Semaine en cours)</h3>
          <div className="flex items-end justify-between h-48 gap-2">
            {weeklyData.map((data, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex justify-center">
                  <div 
                    className="w-12 bg-blue-500 rounded-t-lg transition-all duration-500 group-hover:bg-blue-600"
                    style={{ height: `${(data.hours / maxHours) * 160}px` }}
                  >
                    {data.hours > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        {data.hours}h
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase">{data.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Details Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Historique des cours ce mois-ci</h3>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-3 font-semibold text-slate-600">Date</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Statut</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Heures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthLessons.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Aucun cours trouvé pour cette période.</td></tr>
              ) : monthLessons.map((l: any) => {
                const isPast = isBefore(new Date(l.endTime), now);
                const duration = (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / (1000 * 60 * 60);
                return (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-900">
                      {format(new Date(l.startTime), 'dd MMMM yyyy', { locale: fr })}
                      <div className="text-xs text-slate-400">{format(new Date(l.startTime), 'HH:mm')} - {format(new Date(l.endTime), 'HH:mm')}</div>
                    </td>
                    <td className="px-6 py-4">
                      {l.isCancelled ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Annulé</span>
                      ) : isPast ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Réalisé</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Prévu</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{duration.toFixed(1)}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
