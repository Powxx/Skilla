"use client";

import React, { useState, useTransition } from 'react';
import { updateMeetingStatus, createAdminScheduledMeeting } from '@/app/actions/meetings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type User = { id: string; firstName: string | null; lastName: string | null; role: string };

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Élève',
  RESPONSIBLE: 'Parent',
  PARENT: 'Parent',
  COMPANY_TUTOR: 'Tuteur entreprise',
  TEACHER: 'Professeur',
};

export default function AdminMeetingsManager({
  initialMeetings,
  scheduledMeetings = [],
  users = [],
}: {
  initialMeetings: any[];
  scheduledMeetings?: any[];
  users?: User[];
}) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'pending' | 'scheduled'>('pending');

  // Accept meeting form (respond to incoming request)
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Create new meeting modal
  const [showCreate, setShowCreate] = useState(false);
  const [createTarget, setCreateTarget] = useState<'user' | 'self'>('user');
  const [createUserId, setCreateUserId] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createTime, setCreateTime] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

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

  const handleCreateMeeting = () => {
    if (!createReason.trim() || !createDate || !createTime) {
      alert('Veuillez remplir le motif, la date et l\'heure.');
      return;
    }
    if (createTarget === 'user' && !createUserId) {
      alert('Veuillez sélectionner un utilisateur.');
      return;
    }

    startTransition(async () => {
      await createAdminScheduledMeeting({
        targetUserId: createTarget === 'user' ? createUserId : null,
        reason: createReason,
        scheduledAt: new Date(`${createDate}T${createTime}`).toISOString(),
        adminNotes: createNotes || undefined,
      });
      setCreateSuccess(true);
      setCreateReason('');
      setCreateDate('');
      setCreateTime('');
      setCreateNotes('');
      setCreateUserId('');
      setTimeout(() => {
        setCreateSuccess(false);
        setShowCreate(false);
      }, 2000);
    });
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Header with create button */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            📅 Demandes de RDV
            {initialMeetings.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black animate-pulse">
                {initialMeetings.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => { setShowCreate(true); setCreateSuccess(false); }}
            className="h-6 px-2 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/30 flex items-center gap-1"
          >
            + Créer
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3 shrink-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition ${
              activeTab === 'pending' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            En attente ({initialMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition ${
              activeTab === 'scheduled' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                          >✕</button>
                        ) : (
                          <>
                            <button
                              onClick={() => openScheduleForm(m.id)}
                              className="h-6 w-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition shadow-sm"
                              title="Accepter & Proposer Date"
                            >✓</button>
                            <button
                              onClick={() => handleStatusUpdate(m.id, 'REJECTED')}
                              className="h-6 w-6 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm"
                              title="Refuser"
                            >✕</button>
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
                            <input type="date" className="w-full rounded-lg border-slate-200 text-xs py-1.5" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Heure</label>
                            <input type="time" className="w-full rounded-lg border-slate-200 text-xs py-1.5" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Note (optionnel)"
                          className="w-full rounded-lg border-slate-200 text-xs py-1.5"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                        />
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
                      <button
                        onClick={() => handleStatusUpdate(m.id, 'COMPLETED')}
                        className="h-6 w-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition shadow-sm text-xs shrink-0"
                        title="Marquer comme terminé"
                      >✓</button>
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

      {/* CREATE MEETING MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">📅 Créer un RDV</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  À destination d'un utilisateur ou usage interne
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="h-7 w-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition text-xs"
              >✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {createSuccess ? (
                <div className="py-10 text-center animate-in fade-in zoom-in duration-300">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">RDV créé avec succès !</p>
                </div>
              ) : (
                <>
                  {/* Destination toggle */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Destinataire</label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200">
                      <button
                        onClick={() => setCreateTarget('user')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                          createTarget === 'user' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        👤 Un utilisateur
                      </button>
                      <button
                        onClick={() => setCreateTarget('self')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                          createTarget === 'self' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        🔒 Usage interne
                      </button>
                    </div>
                  </div>

                  {/* User selector */}
                  {createTarget === 'user' && (
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilisateur cible</label>
                      <select
                        value={createUserId}
                        onChange={(e) => setCreateUserId(e.target.value)}
                        className="w-full rounded-2xl border-slate-200 text-sm py-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="">— Sélectionner —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.lastName?.toUpperCase()} {u.firstName} ({ROLE_LABEL[u.role] ?? u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {createTarget === 'self' && (
                    <div className="bg-slate-50 text-slate-500 text-[10px] font-bold p-3 rounded-xl border border-slate-200">
                      Ce RDV sera visible uniquement par l'administration (mémo interne, aucune notification envoyée).
                    </div>
                  )}

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                      <input
                        type="date"
                        value={createDate}
                        onChange={(e) => setCreateDate(e.target.value)}
                        className="w-full rounded-2xl border-slate-200 text-sm focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Heure</label>
                      <input
                        type="time"
                        value={createTime}
                        onChange={(e) => setCreateTime(e.target.value)}
                        className="w-full rounded-2xl border-slate-200 text-sm focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Motif *</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Bilan de mi-parcours, point disciplinaire..."
                      value={createReason}
                      onChange={(e) => setCreateReason(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 text-sm focus:ring-emerald-500/20 resize-none"
                    />
                  </div>

                  {/* Admin notes */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Note pour le convoqué (optionnel)</label>
                    <input
                      type="text"
                      placeholder="Ex: Bureau 12, merci de venir avec le livret..."
                      value={createNotes}
                      onChange={(e) => setCreateNotes(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 text-sm focus:ring-emerald-500/20"
                    />
                  </div>

                  <button
                    disabled={isPending}
                    onClick={handleCreateMeeting}
                    className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isPending ? 'Création en cours...' : '📅 Confirmer le RDV'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
