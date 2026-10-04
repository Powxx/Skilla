"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Bell, Calendar, UserCheck, ShieldAlert, Sparkles } from "lucide-react";
import AdminMeetingsManager from "./admin-meetings-manager";
import AdminSubstitutionsFeed from "./admin-substitutions-feed";

interface AdminActionFeedCollapsibleProps {
  pendingMeetings: any[];
  scheduledMeetings: any[];
  meetingUsers: any[];
  pendingSubs: any[];
  teachers: any[];
  allSubjects: any[];
}

export default function AdminActionFeedCollapsible({
  pendingMeetings,
  scheduledMeetings,
  meetingUsers,
  pendingSubs,
  teachers,
  allSubjects,
}: AdminActionFeedCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const pendingMeetingsCount = pendingMeetings.length;
  const pendingSubsCount = pendingSubs.length;
  const totalPending = pendingMeetingsCount + pendingSubsCount;

  return (
    <div className="bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-800 text-white transition-all">
      {/* Header bar / Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10">
              <Bell className="h-5 w-5 text-amber-400" />
            </span>
            {totalPending > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Flux d'Actions & Demandes
              </h2>
              {totalPending > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {totalPending} en attente
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  À jour
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Rendez-vous et demandes de remplacements d'enseignants
            </p>
          </div>
        </div>

        {/* Quick badges & Expand button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              📅 {pendingMeetingsCount} RDV à valider
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              🔄 {pendingSubsCount} Remplacement(s)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-black text-white transition border border-white/10 shadow-sm"
          >
            <span>{isOpen ? "Réduire le flux" : `Gérer le flux (${totalPending})`}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Section */}
      {isOpen && (
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Demandes de Rendez-vous
            </h3>
            <AdminMeetingsManager
              initialMeetings={pendingMeetings}
              scheduledMeetings={scheduledMeetings}
              users={meetingUsers}
            />
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              Remplacements Enseignants
            </h3>
            <AdminSubstitutionsFeed
              initialRequests={pendingSubs as any}
              teachers={teachers as any}
              allSubjects={allSubjects as any}
            />
          </div>
        </div>
      )}
    </div>
  );
}
