"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { startOfWeek, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const REASON_PRESETS = ["Maladie", "Formation", "Rendez-vous", "Raison personnelle"];

type Suggestion = {
  id: string;
  name: string;
  status: "FREE" | "BUSY" | "UNAVAILABLE";
  teachesSubject: boolean;
};

type ExistingRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  substituteTeacher: { firstName: string | null; lastName: string | null } | null;
};

export default function TeacherPlanningClient({ teacherId }: { teacherId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [substituteId, setSubstituteId] = useState("");
  const [reason, setReason] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [existingRequest, setExistingRequest] = useState<ExistingRequest | null>(null);
  const [summary, setSummary] = useState("");
  const [homework, setHomework] = useState("");
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'substitute' | 'content'>('info');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLessons = async (date: Date) => {
    setLoading(true);
    const monday = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    try {
      const response = await fetch(`/api/lessons?date=${monday}&teacherId=${teacherId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (error) {
      console.error("Erreur emploi du temps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons(currentDate);
  }, [currentDate]);

  useEffect(() => {
    if (selectedEvent) {
      setSummary(selectedEvent.extendedProps?.summary || "");
      setHomework(selectedEvent.extendedProps?.homework || "");
      setActiveTab('info');
    }
  }, [selectedEvent]);

  const loadSubstitutionData = async (lessonId: string) => {
    setLoadingSuggestions(true);
    try {
      const [sugRes, reqRes] = await Promise.all([
        fetch(`/api/substitutions/suggestions?lessonId=${encodeURIComponent(lessonId)}`),
        fetch("/api/substitutions"),
      ]);
      const sug = sugRes.ok ? await sugRes.json() : [];
      const reqs = reqRes.ok ? await reqRes.json() : [];
      setSuggestions(Array.isArray(sug) ? sug : []);
      const mine: ExistingRequest | null = Array.isArray(reqs)
        ? (reqs as (ExistingRequest & { lessonId: string; createdAt: string })[])
            .filter((r) => r.lessonId === lessonId)
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null
        : null;
      setExistingRequest(mine ?? null);
    } catch {
      setSuggestions([]);
      setExistingRequest(null);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const openSubstituteTab = () => {
    setActiveTab('substitute');
    if (selectedEvent) void loadSubstitutionData(selectedEvent.id);
  };

  const handleCancelSubstitution = async () => {
    if (!existingRequest) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/substitutions?id=${encodeURIComponent(existingRequest.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback({ type: 'success', text: "Demande annulée." });
        setExistingRequest(null);
      } else {
        setFeedback({ type: 'error', text: data.error || "Impossible d'annuler la demande." });
      }
    } catch {
      setFeedback({ type: 'error', text: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setLoading(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEvent.id,
          summary,
          homework,
          notifyStudents: notifyStudents && Boolean(homework.trim())
        })
      });
      if (res.ok) {
        setFeedback({ 
          type: 'success', 
          text: notifyStudents && homework.trim() 
            ? "Contenu enregistré & élèves notifiés !" 
            : "Contenu du cours enregistré." 
        });
        fetchLessons(currentDate);
      } else {
        setFeedback({ type: 'error', text: "Erreur lors de l'enregistrement." });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setLoading(true);
    try {
      const res = await fetch("/api/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedEvent.id,
          substituteTeacherId: substituteId || null,
          reason: reason.trim() || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback({ type: 'success', text: "Demande de remplacement transmise à l'administration." });
        setReason("");
        setSubstituteId("");
        void loadSubstitutionData(selectedEvent.id);
      } else {
        setFeedback({ type: 'error', text: data.error || "Erreur lors de l'envoi." });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {loading && !selectedEvent && (
        <div className="absolute top-0 right-0 z-10 m-2 animate-pulse">
          <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded font-bold">CHARGEMENT...</span>
        </div>
      )}

      <WeeklyCalendar
        events={events}
        onDateChange={(newDate) => {
          if (newDate.getTime() !== currentDate.getTime()) {
            setCurrentDate(newDate);
          }
        }}
        onEventClick={(info) => {
          if (info.event.extendedProps?.type === 'break' || info.event.extendedProps?.type === 'holiday' || info.event.extendedProps?.type === 'holiday-label') return;
          setSelectedEvent(info.event);
          setFeedback(null);
          setSubstituteId("");
          setReason("");
          setExistingRequest(null);
          setSuggestions([]);
        }}
      />

      {mounted && selectedEvent && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg min-w-[320px] max-h-[85vh] my-auto flex flex-col overflow-hidden border border-white/20">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedEvent.extendedProps?.subject}</h2>
                <p className="text-xs text-slate-500 font-medium">Classe : {selectedEvent.extendedProps?.class}</p>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)} 
                className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition"
                title="Fermer"
              >
                &times;
              </button>
            </div>

            <div className="flex border-b border-slate-100 shrink-0">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Infos
              </button>
              <button
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'content' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Cahier de texte
              </button>
              <button
                onClick={openSubstituteTab}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'substitute' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Remplacement
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {feedback && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {feedback.text}
                </div>
              )}

              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Horaire</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Salle</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedEvent.extendedProps?.room || "N/A"}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-sm font-semibold text-slate-700">{format(selectedEvent.start, 'EEEE d MMMM yyyy', { locale: fr })}</p>
                  </div>
                </div>
              )}

              {activeTab === 'content' && (
                <form onSubmit={handleSaveContent} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Résumé du cours (fait)</label>
                    <textarea
                      className="w-full text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[110px] max-h-[220px] custom-scrollbar leading-relaxed"
                      placeholder="Qu'avez-vous fait pendant ce cours ?"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Devoirs (à faire pour le prochain cours)</label>
                    <textarea
                      className="w-full text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[90px] max-h-[200px] custom-scrollbar leading-relaxed"
                      placeholder="Exercices, révisions..."
                      value={homework}
                      onChange={(e) => setHomework(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <input
                      type="checkbox"
                      id="notifyStudentsHomework"
                      checked={notifyStudents}
                      onChange={(e) => setNotifyStudents(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="notifyStudentsHomework" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Notifier les élèves de la classe (in-app & push)
                    </label>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition disabled:opacity-50">
                    {loading ? "Enregistrement..." : "Enregistrer le cahier de texte"}
                  </button>
                </form>
              )}

              {activeTab === 'substitute' && (
                <div className="space-y-4 py-2">
                  {existingRequest && existingRequest.status !== "REJECTED" ? (
                    <div className={`p-4 rounded-2xl border text-xs font-medium leading-relaxed ${existingRequest.status === "APPROVED" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-orange-50 border-orange-100 text-orange-800"}`}>
                      {existingRequest.status === "APPROVED" ? (
                        <p>
                          Remplacement validé
                          {existingRequest.substituteTeacher
                            ? ` : ${(existingRequest.substituteTeacher.lastName || "").toUpperCase()} ${existingRequest.substituteTeacher.firstName || ""}`
                            : ""}
                          .
                        </p>
                      ) : (
                        <>
                          <p>
                            Demande en attente de traitement par l&apos;administration
                            {existingRequest.reason ? ` (motif : ${existingRequest.reason})` : ""}.
                          </p>
                          <button
                            type="button"
                            onClick={handleCancelSubstitution}
                            disabled={loading}
                            className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-orange-700 border border-orange-200 hover:bg-orange-100 disabled:opacity-50"
                          >
                            Annuler ma demande
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {existingRequest?.status === "REJECTED" && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-medium text-red-700">
                          Votre précédente demande a été refusée. Vous pouvez en déposer une nouvelle.
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Motif</label>
                        <div className="flex flex-wrap gap-2">
                          {REASON_PRESETS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setReason(r)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${reason === r ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          maxLength={500}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Ou précisez un autre motif (facultatif)"
                          className="mt-2 w-full text-xs rounded-xl border-slate-200 py-2.5 bg-slate-50 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Remplaçant pressenti (facultatif)
                        </label>
                        {loadingSuggestions ? (
                          <p className="text-xs text-slate-400">Recherche des collègues disponibles…</p>
                        ) : suggestions.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucun collègue à proposer : l&apos;administration choisira.</p>
                        ) : (
                          <ul className="max-h-52 overflow-y-auto custom-scrollbar divide-y divide-slate-100 rounded-xl border border-slate-200">
                            {suggestions.map((t) => {
                              const selectable = t.status !== "BUSY";
                              return (
                                <li key={t.id}>
                                  <button
                                    type="button"
                                    disabled={!selectable}
                                    onClick={() => setSubstituteId(substituteId === t.id ? "" : t.id)}
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition ${substituteId === t.id ? "bg-orange-50" : "hover:bg-slate-50"} disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    <span className="font-semibold text-slate-800">
                                      {t.name}
                                      {t.teachesSubject && (
                                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Même matière</span>
                                      )}
                                    </span>
                                    <span className={`text-[10px] font-bold ${t.status === "FREE" ? "text-emerald-600" : t.status === "BUSY" ? "text-red-600" : "text-amber-600"}`}>
                                      {t.status === "FREE" ? "Disponible" : t.status === "BUSY" ? "Occupé" : "Hors disponibilités"}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          L&apos;administration reste décisionnaire : votre choix est une proposition.
                        </p>
                      </div>

                      <button
                        onClick={handleRequestSubstitution}
                        disabled={loading}
                        className="w-full py-3.5 bg-orange-600 text-white rounded-2xl text-xs font-bold shadow-lg hover:bg-orange-700 transition disabled:opacity-50"
                      >
                        {loading ? "Envoi..." : "Demander un remplacement"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
