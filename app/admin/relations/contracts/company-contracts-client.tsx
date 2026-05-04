"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function CompanyContractsClient({ initialContracts, students, tutors }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    tutorId: '',
    companyName: '',
    type: 'APPRENTICESHIP',
    startDate: '',
    endDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/relations/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({ studentId: '', tutorId: '', companyName: '', type: 'APPRENTICESHIP', startDate: '', endDate: '' });
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contrat ?")) return;
    setLoading(true);
    await fetch(`/api/admin/relations/contracts?id=${id}`, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Nouveau Contrat</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Élève</label>
            <select required className="w-full rounded-xl border-slate-200 text-sm" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})}>
              <option value="">-- Sélectionner l'élève --</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Tuteur Entreprise</label>
            <select required className="w-full rounded-xl border-slate-200 text-sm" value={form.tutorId} onChange={e => setForm({...form, tutorId: e.target.value})}>
              <option value="">-- Sélectionner le tuteur --</option>
              {tutors.map((t: any) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Nom de l'entreprise</label>
            <input required type="text" className="w-full rounded-xl border-slate-200 text-sm" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} placeholder="Ex: Google France" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Type de contrat</label>
            <select className="w-full rounded-xl border-slate-200 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="APPRENTICESHIP">Apprentissage</option>
              <option value="INTERNSHIP">Stage</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Date de début</label>
            <input required type="date" className="w-full rounded-xl border-slate-200 text-sm" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Date de fin</label>
            <input required type="date" className="w-full rounded-xl border-slate-200 text-sm" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
          </div>
        </div>
        <button disabled={loading} className="mt-8 w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-lg">
          {loading ? "Enregistrement..." : "Créer le contrat"}
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Élève</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Entreprise / Tuteur</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Période</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialContracts.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900 text-sm">{c.student.lastName} {c.student.firstName}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-800">{c.companyName}</p>
                  <p className="text-xs text-slate-500">Tuteur: {c.tutor.lastName} {c.tutor.firstName}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {format(new Date(c.startDate), 'MM/yyyy')} → {format(new Date(c.endDate), 'MM/yyyy')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(c.id)} className="text-xs font-bold text-red-500 hover:text-red-700">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
