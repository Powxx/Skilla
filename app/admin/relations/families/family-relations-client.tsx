"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FamilyRelationsClient({ parents, students }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId || !selectedStudentId) return;

    setLoading("add");
    try {
      const res = await fetch('/api/admin/relations/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: selectedParentId, studentId: selectedStudentId })
      });
      if (res.ok) {
        setSelectedStudentId("");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveLink = async (parentId: string, studentId: string) => {
    if (!confirm("Voulez-vous supprimer cette liaison ?")) return;
    setLoading(`${parentId}-${studentId}`);
    try {
      await fetch(`/api/admin/relations/families?parentId=${parentId}&studentId=${studentId}`, {
        method: 'DELETE'
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleAddLink} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid gap-4 sm:grid-cols-3 items-end shadow-sm">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Parent / Responsable</label>
          <select 
            required
            className="w-full rounded-lg border-slate-200 text-sm"
            value={selectedParentId}
            onChange={e => setSelectedParentId(e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
            {parents.map((p: any) => (
              <option key={p.id} value={p.id}>{p.lastName} {p.firstName} ({p.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Relier à l'Élève</label>
          <select 
            required
            className="w-full rounded-lg border-slate-200 text-sm"
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
            {students.map((s: any) => (
              <option key={s.id} value={s.id}>{s.lastName} {s.firstName} ({s.class?.name || 'Sans classe'})</option>
            ))}
          </select>
        </div>
        <button 
          disabled={loading === "add"}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading === "add" ? "Liaison..." : "Créer la liaison"}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {parents.filter((p: any) => p.students.length > 0).map((parent: any) => (
          <div key={parent.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 text-sm">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                {parent.lastName?.[0]}
              </span>
              {parent.lastName} {parent.firstName}
            </h3>
            <ul className="space-y-2">
              {parent.students.map((student: any) => (
                <li key={student.id} className="flex justify-between items-center bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100/50">
                  <span className="text-sm text-blue-900 font-medium">{student.lastName} {student.firstName}</span>
                  <button 
                    onClick={() => handleRemoveLink(parent.id, student.id)}
                    disabled={loading === `${parent.id}-${student.id}`}
                    className="text-xs font-bold text-red-400 hover:text-red-600 transition"
                  >
                    Délier
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
