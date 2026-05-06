"use client";

import React, { useState, useTransition, useRef } from 'react';
import { createClassCompetency, deleteClassCompetency } from './actions';
import Papa from 'papaparse';

export default function ClassCompetenciesClient({ initialClasses, initialCompetencies }: any) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ classId: '', name: '', category: 'SCHOOL' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImportClassId, setActiveImportClassId] = useState<string | null>(null);

  const handleExportCSV = (clId: string, clName: string) => {
    const comps = initialCompetencies.filter((c: any) => c.classId === clId);
    const data = comps.map((c: any) => ({
      Nom: c.name,
      Catégorie: c.category
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `competences_${clName}.csv`);
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeImportClassId) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const payload = results.data.map((row: any) => ({
          classId: activeImportClassId,
          name: row.Nom || row.name || "",
          category: (row.Catégorie || row.category || "SCHOOL").toUpperCase()
        })).filter((c: any) => c.name);

        startTransition(async () => {
          for (const comp of payload) {
            await createClassCompetency(comp);
          }
          setActiveImportClassId(null);
        });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId || !form.name) return;
    startTransition(async () => {
      await createClassCompetency(form);
      setForm({ ...form, name: '' });
    });
  };

  return (
    <div className="space-y-12">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid gap-6 md:grid-cols-4 items-end">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Classe</label>
          <select 
            className="w-full rounded-xl border-slate-200 text-sm"
            value={form.classId}
            onChange={e => setForm({...form, classId: e.target.value})}
          >
            <option value="">Sélectionner...</option>
            {initialClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Nom de la compétence</label>
          <input 
            type="text" 
            className="w-full rounded-xl border-slate-200 text-sm"
            placeholder="Ex: Analyse de besoins"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Catégorie</label>
          <select 
            className="w-full rounded-xl border-slate-200 text-sm"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}
          >
            <option value="SCHOOL">École (Professeurs)</option>
            <option value="ENTERPRISE">Entreprise (Employeurs)</option>
          </select>
        </div>
        <button 
          disabled={isPending}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
        >
          {isPending ? "Ajout..." : "Ajouter à la classe"}
        </button>
      </form>

      <div className="grid gap-8 md:grid-cols-2">
        {initialClasses.map((cl: any) => {
          const comps = initialCompetencies.filter((c: any) => c.classId === cl.id);
          if (comps.length === 0) return null;
          return (
            <div key={cl.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">{cl.name}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleExportCSV(cl.id, cl.name)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-900 uppercase tracking-tight"
                  >
                    Exporter
                  </button>
                  <button 
                    onClick={() => {
                      setActiveImportClassId(cl.id);
                      fileInputRef.current?.click();
                    }}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-800 uppercase tracking-tight"
                  >
                    Importer
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {comps.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{c.name}</p>
                      <span className={`text-[10px] font-black uppercase ${c.category === 'SCHOOL' ? 'text-blue-600' : 'text-amber-600'}`}>
                        {c.category === 'SCHOOL' ? 'ÉCOLE' : 'ENTREPRISE'}
                      </span>
                    </div>
                    <button 
                      onClick={() => startTransition(() => deleteClassCompetency(c.id))}
                      className="text-xs text-red-400 hover:text-red-600 font-bold"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportCSV} 
        accept=".csv" 
        className="hidden" 
      />
    </div>
  );
}
