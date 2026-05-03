"use client";

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { startOfWeek, format } from 'date-fns';

export default function PlanningClient({ classId, teacherId }: { classId?: string; teacherId?: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

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
        events={events} 
        onDateChange={(newDate) => setCurrentDate(newDate)} 
      />
    </div>
  );
}
