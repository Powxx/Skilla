"use client";

import React, { useState, useTransition } from 'react';
import { createMeetingRequest } from '@/app/actions/meetings';
import Link from 'next/link';

export default function MeetingRequestForm() {
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    startTransition(async () => {
      await createMeetingRequest(reason);
      setSent(true);
      setReason('');
      setTimeout(() => setSent(false), 5000);
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Solliciter un rendez-vous</h3>
      <p className="text-xs text-slate-500 mb-4">Expliquez brièvement le motif de votre demande. L'administration reviendra vers vous rapidement.</p>
      
      {sent ? (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl text-sm font-medium animate-in fade-in zoom-in duration-300">
          Votre demande a été envoyée avec succès !
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Point sur la progression en entreprise, difficulté particulière..."
            className="w-full rounded-2xl border-slate-200 text-sm min-h-[100px] focus:ring-slate-900 focus:border-slate-900"
            required
          />
          <button
            disabled={isPending}
            className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isPending ? "Envoi..." : "Envoyer la demande"}
          </button>
        </form>
      )}

      <Link
        href="/meetings"
        className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition"
      >
        📅 Voir mes rendez-vous confirmés →
      </Link>
    </div>
  );
}
