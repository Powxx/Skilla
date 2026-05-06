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
  initialNotificationConfigs = []
}: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('classes');

  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState({ name: '', start: '', end: '' });

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

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
    setLoading(true);
    await fetch(`/api/admin/${type}?id=${id}`, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-100 bg-slate-50">
        <button 
          onClick={() => setActiveTab('classes')}
          className={`px-6 py-4 text-sm font-semibold transition ${activeTab === 'classes' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Classes ({initialClasses.length})
        </button>
        <button 
          onClick={() => setActiveTab('subjects')}
          className={`px-6 py-4 text-sm font-semibold transition ${activeTab === 'subjects' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Matières ({initialSubjects.length})
        </button>
        <button 
          onClick={() => setActiveTab('semesters')}
          className={`px-6 py-4 text-sm font-semibold transition ${activeTab === 'semesters' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Semestres / Périodes ({initialSemesters.length})
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`px-6 py-4 text-sm font-semibold transition ${activeTab === 'notifications' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Notifications ({initialNotificationConfigs.length})
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <form onSubmit={handleAddClass} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nom de la nouvelle classe (ex: BTS SIO 1)" 
                className="flex-1 rounded-lg border-slate-200 text-sm"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-2">
              {initialClasses.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group">
                  <span className="font-medium text-slate-700">{c.name}</span>
                  <button onClick={() => handleDelete('classes', c.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <form onSubmit={handleAddSubject} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nom de la nouvelle matière (ex: Mathématiques)" 
                className="flex-1 rounded-lg border-slate-200 text-sm"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-2">
              {initialSubjects.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group">
                  <span className="font-medium text-slate-700">{s.name}</span>
                  <button onClick={() => handleDelete('subjects', s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'semesters' && (
          <div className="space-y-6">
            <form onSubmit={handleAddSemester} className="grid gap-3 sm:grid-cols-4 items-end">
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nom de la période</label>
                <input 
                  type="text" 
                  placeholder="Ex: Semestre 1 2026" 
                  className="w-full rounded-lg border-slate-200 text-sm"
                  value={newSemester.name}
                  onChange={e => setNewSemester({...newSemester, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Début</label>
                <input 
                  type="date" 
                  className="w-full rounded-lg border-slate-200 text-sm"
                  value={newSemester.start}
                  onChange={e => setNewSemester({...newSemester, start: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Fin</label>
                <input 
                  type="date" 
                  className="w-full rounded-lg border-slate-200 text-sm"
                  value={newSemester.end}
                  onChange={e => setNewSemester({...newSemester, end: e.target.value})}
                  required
                />
              </div>
              <button disabled={loading} className="sm:col-span-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Créer la période</button>
            </form>
            <div className="space-y-2">
              {initialSemesters.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-slate-50 group">
                  <div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      Du {format(new Date(s.startDate), 'dd/MM/yyyy')} au {format(new Date(s.endDate), 'dd/MM/yyyy')}
                    </div>
                  </div>
                  <button onClick={() => handleDelete('semesters', s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Configurez ici les déclencheurs de notifications automatiques. Vous pouvez activer/désactiver chaque événement et choisir quels rôles recevront les notifications (si applicable).
              </p>
            </div>

            {initialNotificationConfigs.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-sm text-slate-400 italic">Aucune configuration de notification trouvée. Elles seront créées lors de la première utilisation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {initialNotificationConfigs.map((config: any) => (
                  <div key={config.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{config.event}</h3>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Dernière mise à jour : {format(new Date(config.updatedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                      </div>
                      <button
                        onClick={() => handleUpdateNotifConfig(config.id, !config.isEnabled)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                          config.isEnabled 
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {config.isEnabled ? 'Activé' : 'Désactivé'}
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destinataires (Rôles)</label>
                        <div className="flex flex-wrap gap-2">
                          {['STUDENT', 'TEACHER', 'RESPONSIBLE', 'COMPANY_TUTOR', 'ADMIN'].map((role) => (
                            <button
                              key={role}
                              onClick={() => handleUpdateNotifRoles(config.id, role, config.targetRoles)}
                              disabled={loading || !config.isEnabled}
                              className={`px-2 py-1 rounded-md text-[9px] font-bold border transition ${
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
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aperçu du message</p>
                         <p className="text-xs font-bold text-slate-700">{config.title}</p>
                         <p className="text-[11px] text-slate-500 mt-0.5">{config.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
