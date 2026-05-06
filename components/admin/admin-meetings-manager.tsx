"use client";

import React, { useTransition } from 'react';
import { updateMeetingStatus } from '@/app/actions/meetings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminMeetingsManager({ initialMeetings }: { initialMeetings: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusUpdate = (id: string, status: string) => {
    startTransition(async () => {
      await updateMeetingStatus(id, status);
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        📅 Demandes de RDV
        {initialMeetings.length > 0 && (
          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
            {initialMeetings.length}
          </span>
        )}
      </h2>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {initialMeetings.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 italic text-sm">
            Aucune demande en attente.
          </div>
        ) : (
          initialMeetings.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{m.sender.firstName} {m.sender.lastName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    {m.sender.role} • {format(new Date(m.requestedAt), 'dd MMM HH:mm', { locale: fr })}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                   <button 
                     onClick={() => handleStatusUpdate(m.id, 'SCHEDULED')}
                     className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                     title="Accepter"
                   >
                     ✓
                   </button>
                   <button 
                     onClick={() => handleStatusUpdate(m.id, 'REJECTED')}
                     className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                     title="Refuser"
                   >
                     ✕
                   </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                "{m.reason}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
