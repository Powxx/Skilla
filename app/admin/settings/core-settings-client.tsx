"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function CoreSettingsClient({ initialClasses, initialSubjects, initialSemesters }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('classes');

  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState({ name: '', start: '', end: '' });

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
      </div>
    </div>
  );
}
