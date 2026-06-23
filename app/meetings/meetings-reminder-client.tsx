"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

type Meeting = {
  id: string;
  reason: string;
  status: string;
  requestedAt: string;
  scheduledAt: string | null;
  adminNotes: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  PENDING:   { label: "En attente",  color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200", icon: "⏳" },
  SCHEDULED: { label: "Confirmé",    color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",icon: "✅" },
  REJECTED:  { label: "Refusé",      color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",   icon: "❌" },
  COMPLETED: { label: "Terminé",     color: "text-slate-500",  bg: "bg-slate-50",  border: "border-slate-200", icon: "✔️" },
};

export default function MeetingsReminderClient({ meetings }: { meetings: Meeting[] }) {
  const upcoming = meetings.filter(m => m.status === "SCHEDULED");
  const others   = meetings.filter(m => m.status !== "SCHEDULED");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="h-10 w-10 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white text-xl">
              📅
            </span>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Mes Rendez-vous</h1>
          </div>
          <p className="text-sm text-slate-400 font-medium ml-13 pl-[52px]">
            Retrouvez ici tous vos rendez-vous avec l'administration.
          </p>
        </div>

        {/* Upcoming confirmed */}
        {upcoming.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
              📌 Rendez-vous à venir
            </h2>
            <div className="space-y-4">
              {upcoming.map((m) => (
                <div
                  key={m.id}
                  className="relative bg-white border-2 border-emerald-200 rounded-3xl p-6 shadow-lg shadow-emerald-500/10 overflow-hidden"
                >
                  {/* Accent bar */}
                  <div className="absolute left-0 top-0 h-full w-1.5 bg-emerald-500 rounded-l-3xl" />
                  <div className="pl-3">
                    {/* Date highlight */}
                    {m.scheduledAt && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-emerald-500 text-white rounded-2xl px-4 py-2 text-center shadow-md shadow-emerald-500/30 shrink-0">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                            {format(new Date(m.scheduledAt), "MMMM", { locale: fr })}
                          </p>
                          <p className="text-3xl font-black leading-none">
                            {format(new Date(m.scheduledAt), "dd")}
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900">
                            {format(new Date(m.scheduledAt), "EEEE d MMMM yyyy", { locale: fr })}
                          </p>
                          <p className="text-base font-bold text-emerald-600">
                            à {format(new Date(m.scheduledAt), "HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Reason */}
                    <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 italic mb-3">
                      "{m.reason}"
                    </p>
                    {/* Admin notes */}
                    {m.adminNotes && (
                      <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                        <span className="text-emerald-500 text-base shrink-0">📝</span>
                        <p className="text-sm text-emerald-700 font-medium">{m.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All requests */}
        <section>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
            Historique de vos demandes
          </h2>

          {meetings.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucune demande envoyée</p>
              <p className="text-xs text-slate-300 mt-1">Revenez sur votre tableau de bord pour en créer une.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {others.map((m) => {
                const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG["PENDING"];
                return (
                  <div
                    key={m.id}
                    className={`bg-white border ${cfg.border} rounded-2xl p-4 flex items-start gap-4 shadow-sm`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">
                          {format(new Date(m.requestedAt), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic line-clamp-2">"{m.reason}"</p>
                      {m.adminNotes && (
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">Note : {m.adminNotes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-10 text-center">
          <Link href="/student/dashboard" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition">
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
