"use client";

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { startOfWeek, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TeacherPlanningClient({ teacherId, teachers }: { teacherId: string; teachers: any[] }) {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [substituteId, setSubstituteId] = useState("");
  const [summary, setSummary] = useState("");
  const [homework, setHomework] = useState("");
  const [activeTab, setActiveTab] = useState<'info' | 'substitute' | 'content'>('info');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
      console.error("Erreur planning:", error);
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
          homework
        })
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: "Contenu du cours enregistré." });
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
          lessonId: selectedEvent.id
        })
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: "Demande de remplacement transmise à l'administration." });
      } else {
        setFeedback({ type: 'error', text: "Erreur lors de l'envoi." });
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
          setSelectedEvent(info.event);
          setFeedback(null);
          setSubstituteId("");
        }}
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedEvent.extendedProps?.subject}</h2>
                <p className="text-xs text-slate-500 font-medium">Classe : {selectedEvent.extendedProps?.class}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition">&times;</button>
            </div>

            <div className="flex border-b border-slate-100">
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
                onClick={() => setActiveTab('substitute')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'substitute' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Remplacement
              </button>
            </div>
            
            <div className="p-6">
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
                      className="w-full text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
                      placeholder="Qu'avez-vous fait pendant ce cours ?"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Devoirs (à faire pour le prochain cours)</label>
                    <textarea 
                      className="w-full text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
                      placeholder="Exercices, révisions..."
                      value={homework}
                      onChange={(e) => setHomework(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition disabled:opacity-50">
                    {loading ? "Enregistrement..." : "Enregistrer le cahier de texte"}
                  </button>
                </form>
              )}

              {activeTab === 'substitute' && (
                <div className="space-y-6 py-4">
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                     <p className="text-sm text-orange-800 font-medium leading-relaxed">
                       Vous ne pouvez pas assurer ce cours ? Cliquez sur le bouton ci-dessous pour demander un remplacement. 
                       L'administration sera notifiée et se chargera de trouver un remplaçant qualifié.
                     </p>
                  </div>
                  <button 
                    onClick={handleRequestSubstitution} 
                    disabled={loading} 
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-orange-700 transition disabled:opacity-50"
                  >
                    {loading ? "Envoi..." : "Demander un remplacement"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
