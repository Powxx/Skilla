"use client";

import React, { useState, useTransition } from 'react';
import { updateMeetingStatus } from '@/app/actions/meetings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminMeetingsManager({
  initialMeetings,
  scheduledMeetings = [],
}: {
  initialMeetings: any[];
  scheduledMeetings?: any[];
}) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'pending' | 'scheduled'>('pending');
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const handleStatusUpdate = (id: string, status: string, dateObj?: Date, notes?: string) => {
    startTransition(async () => {
      await updateMeetingStatus(id, status, dateObj, notes);
      if (schedulingId === id) setSchedulingId(null);
    });
  };

  const openScheduleForm = (id: string) => {
    setSchedulingId(id);
    setScheduledDate('');
    setScheduledTime('');
    setAdminNotes('');
  };

  const submitSchedule = (id: string) => {
    if (!scheduledDate || !scheduledTime) {
      alert('Veuillez choisir une date et une heure.');
      return;
    }
    handleStatusUpdate(id, 'SCHEDULED', new Date(`${scheduledDate}T${scheduledTime}`), adminNotes);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-2">📅 Demandes de RDV</span>
        {initialMeetings.length > 0 && (
          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black animate-pulse">
            {initialMeetings.length}
          </span>
        )}
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition ${
            activeTab === 'pending'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          En attente ({initialMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition ${
            activeTab === 'scheduled'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Planifiés ({scheduledMeetings.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {/* PENDING TAB */}
        {activeTab === 'pending' && (
          <>
            {initialMeetings.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-[10px] font-bold uppercase tracking-widest">
                Aucun RDV en attente.
              </div>
            ) : (
              initialMeetings.map((m) => (
                <div key={m.id} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:shadow-md transition group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate leading-tight">
                        {m.sender.firstName} {m.sender.lastName}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                        {m.sender.role} • {format(new Date(m.requestedAt), 'dd MMM HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {schedulingId === m.id ? (
                        <button
                          onClick={() => setSchedulingId(null)}
                          className="h-6 w-6 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition shadow-sm text-xs"
                          title="Annuler"
                        >
                          ✕
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => openScheduleForm(m.id)}
                            className="h-6 w-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition shadow-sm"
                            title="Accepter & Proposer Date"
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
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-tight italic line-clamp-2 relative z-10 mb-2">
                    "{m.reason}"
                  </p>

                  {schedulingId === m.id && (
                    <div className="mt-2 p-3 bg-white border border-emerald-100 rounded-xl relative z-10 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                          <input
                            type="date"
                            className="w-full rounded-lg border-slate-200 text-xs py-1.5 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Heure</label>
                          <input
                            type="time"
                            className="w-full rounded-lg border-slate-200 text-xs py-1.5 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Note (optionnel)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Bureau 12, venir avec le livret..."
                          className="w-full rounded-lg border-slate-200 text-xs py-1.5 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                        />
                      </div>
                      <button
                        disabled={isPending}
                        onClick={() => submitSchedule(m.id)}
                        className="w-full bg-emerald-500 text-white py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition disabled:opacity-50"
                      >
                        {isPending ? 'Validation...' : 'Confirmer le RDV'}
                      </button>
                    </div>
                  )}
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20 group-hover:opacity-100 transition" />
                </div>
              ))
            )}
          </>
        )}

        {/* SCHEDULED TAB */}
        {activeTab === 'scheduled' && (
          <>
            {scheduledMeetings.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-[10px] font-bold uppercase tracking-widest">
                Aucun RDV planifié.
              </div>
            ) : (
              scheduledMeetings.map((m) => (
                <div key={m.id} className="bg-white border border-emerald-200 p-3 rounded-xl shadow-sm hover:shadow-md transition group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-emerald-900 truncate leading-tight">
                        {m.sender.firstName} {m.sender.lastName}
                      </p>
                      <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter mt-0.5">
                        {m.sender.role} •{' '}
                        {m.scheduledAt
                          ? format(new Date(m.scheduledAt), 'dd MMM yyyy HH:mm', { locale: fr })
                          : 'Date non définie'}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleStatusUpdate(m.id, 'COMPLETED')}
                        className="h-6 w-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition shadow-sm text-xs"
                        title="Marquer comme terminé"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                  {m.adminNotes && (
                    <p className="text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 leading-tight italic line-clamp-2 relative z-10 mb-2">
                      📝 {m.adminNotes}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-tight italic line-clamp-2 relative z-10">
                    "{m.reason}"
                  </p>
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50 group-hover:opacity-100 transition" />
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
