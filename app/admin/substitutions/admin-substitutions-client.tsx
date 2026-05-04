"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function AdminSubstitutionsClient({ initialRequests }: { initialRequests: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    setLoading(id);
    try {
      const res = await fetch("/api/substitutions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {initialRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          Aucune demande de remplacement pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Cours</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Demande</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">{req.lesson.subject.name}</div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(req.lesson.startTime), 'EEEE d MMMM HH:mm', { locale: fr })}
                    </div>
                    <div className="text-xs text-slate-400">Classe : {req.lesson.class.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-900">{req.originalTeacher.lastName}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-medium text-slate-900">{req.substituteTeacher.lastName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      req.status === 'PENDING' ? 'bg-orange-100 text-orange-800' :
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.status === 'PENDING' ? 'En attente' : req.status === 'APPROVED' ? 'Accepté' : 'Refusé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAction(req.id, "REJECTED")}
                          disabled={!!loading}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "APPROVED")}
                          disabled={!!loading}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                        >
                          Valider
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
