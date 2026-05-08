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
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
           📅 Demandes de RDV
        </span>
        {initialMeetings.length > 0 && (
          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black animate-pulse">
            {initialMeetings.length}
          </span>
        )}
      </h2>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {initialMeetings.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-[10px] font-bold uppercase tracking-widest">
            Aucun RDV.
          </div>
        ) : (
          initialMeetings.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:shadow-md transition group relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate leading-tight">{m.sender.firstName} {m.sender.lastName}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                    {m.sender.role} • {format(new Date(m.requestedAt), 'dd MMM HH:mm', { locale: fr })}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                   <button 
                     onClick={() => handleStatusUpdate(m.id, 'SCHEDULED')}
                     className="h-6 w-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition shadow-sm"
                     title="Accepter"
                   >
                     ✓
                   </button>
                   <button 
                     onClick={() => handleStatusUpdate(m.id, 'REJECTED')}
                     className="h-6 w-6 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm"
                     title="Refuser"
                   >
                     ✕
                   </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-tight italic line-clamp-2 relative z-10">
                "{m.reason}"
              </p>
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20 group-hover:opacity-100 transition"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
