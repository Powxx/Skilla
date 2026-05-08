"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { updateNotificationConfig } from '@/app/actions/notifications';

export default function CoreSettingsClient({ 
  initialClasses, 
  initialSubjects, 
  initialSemesters,
  initialNotificationConfigs = [],
  initialHolidays = []
}: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('classes');

  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState({ name: '', start: '', end: '' });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });

  const handleUpdateNotifConfig = async (id: string, isEnabled: boolean) => {
    setLoading(true);
    await updateNotificationConfig(id, { isEnabled });
    setLoading(false);
    router.refresh();
  };

  const handleUpdateNotifRoles = async (id: string, role: string, currentRoles: string[]) => {
    setLoading(true);
    const newRoles = currentRoles.includes(role) 
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    await updateNotificationConfig(id, { targetRoles: newRoles as any });
    setLoading(false);
    router.refresh();
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
    setNewName('');
    setLoading(false);
    router.refresh();
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/subjects', {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
    setNewName('');
    setLoading(false);
    router.refresh();
  };

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/semesters', {
      method: 'POST',
      body: JSON.stringify({ name: newSemester.name, startDate: newSemester.start, endDate: newSemester.end }),
    });
    setNewSemester({ name: '', start: '', end: '' });
    setLoading(false);
    router.refresh();
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/holidays', {
      method: 'POST',
      body: JSON.stringify(newHoliday),
    });
    setNewHoliday({ name: '', date: '' });
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
    setLoading(true);
    await fetch(`/api/admin/${type}?id=${id}`, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setActiveTab('classes')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'classes' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Classes ({initialClasses.length})
        </button>
        <button 
          onClick={() => setActiveTab('subjects')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'subjects' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Matières ({initialSubjects.length})
        </button>
        <button 
          onClick={() => setActiveTab('semesters')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'semesters' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Semestres ({initialSemesters.length})
        </button>
        <button 
          onClick={() => setActiveTab('holidays')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'holidays' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Jours Fériés ({initialHolidays.length})
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'notifications' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Notifications ({initialNotificationConfigs.length})
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
        {activeTab === 'classes' && (
          <div className="space-y-5">
            <form onSubmit={handleAddClass} className="flex gap-2 shrink-0 sticky top-0 bg-white pb-4 z-10">
              <input 
                type="text" 
                placeholder="Nouvelle classe..." 
                className="flex-1 rounded-xl border-slate-200 text-xs py-2 focus:ring-blue-500/20"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-3">
              {initialClasses.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition">
                  <span className="text-[11px] font-black text-slate-700 truncate">{c.name}</span>
                  <button onClick={() => handleDelete('classes', c.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-5">
            <form onSubmit={handleAddSubject} className="flex gap-2 shrink-0 sticky top-0 bg-white pb-4 z-10">
              <input 
                type="text" 
                placeholder="Nouvelle matière..." 
                className="flex-1 rounded-xl border-slate-200 text-xs py-2 focus:ring-blue-500/20"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-3">
              {initialSubjects.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition">
                  <span className="text-[11px] font-black text-slate-700 truncate">{s.name}</span>
                  <button onClick={() => handleDelete('subjects', s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'semesters' && (
          <div className="space-y-5">
            <form onSubmit={handleAddSemester} className="grid gap-2 sm:grid-cols-4 items-end shrink-0 sticky top-0 bg-white pb-4 z-10">
              <div className="sm:col-span-1">
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Nom</label>
                <input 
                  type="text" 
                  placeholder="Ex: S1 2026" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSemester.name}
                  onChange={e => setNewSemester({...newSemester, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Début</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSemester.start}
                  onChange={e => setNewSemester({...newSemester, start: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Fin</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSemester.end}
                  onChange={e => setNewSemester({...newSemester, end: e.target.value})}
                  required
                />
              </div>
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Créer</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-2">
              {initialSemesters.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition">
                  <div>
                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{s.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      {format(new Date(s.startDate), 'dd/MM/yy')} — {format(new Date(s.endDate), 'dd/MM/yy')}
                    </div>
                  </div>
                  <button onClick={() => handleDelete('semesters', s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition text-[10px] font-black uppercase">Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="space-y-5">
            <form onSubmit={handleAddHoliday} className="grid gap-2 sm:grid-cols-3 items-end shrink-0 sticky top-0 bg-white pb-4 z-10">
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Nom</label>
                <input 
                  type="text" 
                  placeholder="Ex: Noël" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newHoliday.name}
                  onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Date</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newHoliday.date}
                  onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                  required
                />
              </div>
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-2">
              {initialHolidays.map((h: any) => (
                <div key={h.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition">
                  <div>
                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{h.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      {format(new Date(h.date), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                  <button onClick={() => handleDelete('holidays', h.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition text-[10px] font-black uppercase">Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 shrink-0">
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest leading-relaxed">
                Configurez les déclencheurs de notifications automatiques.
              </p>
            </div>

            <div className="grid gap-3">
              {initialNotificationConfigs.map((config: any) => (
                <div key={config.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-100 transition group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{config.event}</h3>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">MàJ : {format(new Date(config.updatedAt), 'dd/MM HH:mm')}</p>
                    </div>
                    <button
                      onClick={() => handleUpdateNotifConfig(config.id, !config.isEnabled)}
                      disabled={loading}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition shadow-sm ${
                        config.isEnabled 
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      {config.isEnabled ? 'Activé' : 'Off'}
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 relative z-10">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cibles</label>
                      <div className="flex flex-wrap gap-1">
                        {['STUDENT', 'TEACHER', 'RESPONSIBLE', 'COMPANY_TUTOR', 'ADMIN'].map((role) => (
                          <button
                            key={role}
                            onClick={() => handleUpdateNotifRoles(config.id, role, config.targetRoles)}
                            disabled={loading || !config.isEnabled}
                            className={`px-2 py-0.5 rounded-md text-[8px] font-black border transition uppercase ${
                              config.targetRoles.includes(role)
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            } ${!config.isEnabled && 'opacity-50 cursor-not-allowed'}`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Message</p>
                       <p className="text-[10px] font-black text-slate-700 truncate">{config.title}</p>
                       <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{config.message}</p>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-10 group-hover:opacity-100 transition"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
