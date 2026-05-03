"use client";

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { startOfWeek, format } from 'date-fns';

export default function PlanningPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Remplace par un ID valide de ta table Class sur Supabase
  const classId = "TON_ID_DE_CLASSE_REEL"; 

  const fetchLessons = async (date: Date) => {
    if (!classId || classId === "TON_ID_DE_CLASSE_REEL") return;
    
    setLoading(true);
    const monday = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    try {
      const response = await fetch(`/api/lessons?classId=${classId}&date=${monday}`);
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Mon Planning Skilla</h1>
          {loading && <span className="text-sm text-blue-500 animate-pulse">Mise à jour...</span>}
        </header>

        <div className="border rounded-xl shadow-sm bg-white p-2">
          <WeeklyCalendar 
            events={events} 
            onDateChange={(newDate) => setCurrentDate(newDate)} 
          />
        </div>
      </div>
    </div>
  );
}