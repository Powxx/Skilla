"use client";

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { startOfWeek, format } from 'date-fns';

// On importe les styles ici pour éviter les erreurs PostCSS au build
import '@fullcalendar/common/main.css';
import '@fullcalendar/daygrid/main.css';
import '@fullcalendar/timegrid/main.css';

export default function PlanningPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // À terme, récupère l'ID de la classe via la session utilisateur
  // Pour le test, utilise l'ID d'une de tes classes créées en Seed
  const classId = "TON_ID_DE_CLASSE_SUPABASE"; 

  const fetchLessons = async (date: Date) => {
    setLoading(true);
    const monday = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    try {
      const response = await fetch(`/api/lessons?classId=${classId}&date=${monday}`);
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Erreur chargement planning:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    if (classId) fetchLessons(currentDate);
  }, [classId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-8 py-6 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Emploi du temps</h1>
          <p className="text-sm text-slate-500">Gestion des cours et alternance</p>
        </div>

        <div className="flex items-center gap-4">
          {loading && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          )}
          <span className="text-xs font-medium px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
            Classe ID: {classId.substring(0, 8)}...
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <WeeklyCalendar 
            events={events} 
            onDateChange={(newDate) => fetchLessons(newDate)} 
          />
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="font-semibold text-blue-800">Rythme Alternance</h3>
            <p className="text-sm text-blue-600">1 semaine CFA / 3 semaines Entreprise</p>
          </div>
          {/* Tu pourras ajouter ici des stats ou des rappels */}
        </div>
      </main>
    </div>
  );
}