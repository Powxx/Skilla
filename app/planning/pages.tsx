"use client";

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar'; // Le composant qu'on a préparé
import { startOfWeek, format } from 'date-fns';

export default function PlanningPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Remplace ceci par l'ID d'une classe existante dans ta base (ex: récupéré via la session)
  const classId = "TON_ID_DE_CLASSE_ICI"; 

  useEffect(() => {
    async function fetchLessons() {
      setLoading(true);
      // On demande le lundi de la semaine affichée
      const monday = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      try {
        const response = await fetch(`/api/lessons?classId=${classId}&date=${monday}`);
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Erreur lors du chargement des cours:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLessons();
  }, [currentDate, classId]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emploi du temps</h1>
          <p className="text-gray-600">Visualisez vos cours et périodes en entreprise</p>
        </div>
        
        <div className="bg-white p-2 rounded-lg shadow-sm border">
          {/* Indicateur de chargement discret */}
          {loading ? "Chargement..." : "Calendrier à jour"}
        </div>
      </header>

      <main className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
        <WeeklyCalendar initialEvents={events} />
      </main>
    </div>
  );
}