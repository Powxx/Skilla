"use client";

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { startOfWeek, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getSpecialCalendarEvents } from '@/lib/calendar-utils';

export default function PlanningClient({ classId, teacherId }: { classId?: string; teacherId?: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/admin/holidays');
      const data = await res.json();
      if (Array.isArray(data)) setHolidays(data);
    } catch (err) {
      console.error("Erreur holidays:", err);
    }
  };

  const fetchLessons = async (date: Date) => {
    if (!classId && !teacherId) return;
    
    setLoading(true);
    const monday = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    try {
      const params = new URLSearchParams();
      params.set('date', monday);
      if (classId) params.set('classId', classId);
      if (teacherId) params.set('teacherId', teacherId);

      const response = await fetch(`/api/lessons?${params.toString()}`);
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
    fetchHolidays();
  }, []);

  useEffect(() => {
    fetchLessons(currentDate);
  }, [currentDate, classId, teacherId]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-0 right-0 z-10 m-2">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 animate-pulse">
            Chargement...
          </span>
        </div>
      )}
      <WeeklyCalendar 
        events={[...events, ...getSpecialCalendarEvents(currentDate, holidays)]} 
        onDateChange={(newDate) => {
          if (newDate.getTime() !== currentDate.getTime()) {
            setCurrentDate(newDate);
          }
        }} 
        onEventClick={(info) => {
          // Don't open for special events (lunch, holidays)
          if (info.event.id) {
            setSelectedEvent(info.event);
          }
        }}
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedEvent.extendedProps?.subject}</h2>
                <p className="text-xs text-slate-500 font-medium">{selectedEvent.extendedProps?.teacher}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Infos Row */}
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

              {/* Content Sections */}
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Contenu du cours</h3>
                  {selectedEvent.extendedProps?.summary ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedEvent.extendedProps.summary}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Aucun résumé renseigné pour ce cours.</p>
                  )}
                </div>

                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <h3 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Devoirs à faire</h3>
                  {selectedEvent.extendedProps?.homework ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedEvent.extendedProps.homework}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Aucun devoir pour le prochain cours.</p>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedEvent(null)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
