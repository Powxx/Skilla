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

  const handleRequestSubstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !substituteId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedEvent.id,
          substituteTeacherId: substituteId
        })
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: "Demande de remplacement envoyée à l'administration." });
        setTimeout(() => setSelectedEvent(null), 2000);
      } else {
        setFeedback({ type: 'error', text: "Erreur lors de l'envoi de la demande." });
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Demander un remplacement</h2>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <form onSubmit={handleRequestSubstitution} className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4">
                <div className="font-semibold text-blue-900">{selectedEvent.title}</div>
                <div className="text-xs text-blue-700 mt-1">
                  {format(selectedEvent.start, 'EEEE d MMMM HH:mm', { locale: fr })}
                </div>
              </div>

              {feedback && (
                <div className={`p-3 rounded-lg text-xs font-bold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {feedback.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Choisir un collègue remplaçant</label>
                <select 
                  required
                  className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  value={substituteId}
                  onChange={(e) => setSubstituteId(e.target.value)}
                >
                  <option value="">-- Sélectionner un professeur --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setSelectedEvent(null)} className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">Annuler</button>
                <button type="submit" disabled={loading || !substituteId} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
                  {loading ? "Envoi..." : "Envoyer la demande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
