"use client";

import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { startOfWeek, format, isWithinInterval, parseISO, endOfWeek, addWeeks, setHours, setMinutes, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdvancedPlanningClientProps {
  classes: { id: string; name: string }[];
  teachers: { id: string; firstName: string | null; lastName: string | null; subjects: any[] }[];
  subjects: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
}

export default function AdvancedPlanningClient({ classes, teachers, subjects, rooms }: AdvancedPlanningClientProps) {
  // Left Column: Configuration Form
  const [config, setConfig] = useState({
    duration: "02:00",
    teacherId: "",
    subjectId: "",
    classId: "",
    roomId: "",
    periodicity: "none",
    occurrences: 5
  });

  const selectedTeacher = teachers.find(t => t.id === config.teacherId);
  const selectedSubject = subjects.find(s => s.id === config.subjectId);
  const selectedClass = classes.find(c => c.id === config.classId);
  const selectedRoom = rooms.find(r => r.id === config.roomId);

  // Middle Column: Calendar state
  const calendarRef = useRef<FullCalendar>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Right Column: Filters and Stats
  const [viewFilter, setViewFilter] = useState({ type: 'class', id: '' });

  // Event Modal state
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventFormData, setEventFormData] = useState({
    isCancelled: false,
    substituteId: ""
  });

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/admin/holidays');
      const data = await res.json();
      if (Array.isArray(data)) setHolidays(data);
    } catch (err) {
      console.error("Erreur holidays:", err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    let draggableEl = document.getElementById('external-events');
    if (draggableEl) {
      const draggable = new Draggable(draggableEl, {
        itemSelector: '.fc-event',
        eventData: function(eventEl) {
          const duration = eventEl.getAttribute('data-duration');
          const propsStr = eventEl.getAttribute('data-props');
          if (!propsStr) return false;
          
          const props = JSON.parse(propsStr);
          
          return {
            title: eventEl.innerText,
            duration: duration || "02:00",
            create: true,
            extendedProps: props
          };
        }
      });
      return () => draggable.destroy();
    }
  }, [config]);

  // Fetch events based on current date
  const fetchLessons = async (date: Date) => {
    setLoading(true);
    const monday = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    try {
      const params = new URLSearchParams();
      params.set('date', monday);
      // Fetch ALL lessons to compute stats and detect conflicts
      // we do not filter server side here to allow the client to know everything about the week
      
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
  }, [currentDate]);

  // Conflict Checking logic
  const checkConflicts = (start: Date, end: Date, teacherId: string, classId: string, roomId: string, excludeEventId?: string) => {
    // Check holidays
    const isHoliday = holidays.some(h => isSameDay(typeof h.date === 'string' ? parseISO(h.date) : new Date(h.date), start));
    if (isHoliday) return "Impossible de planifier un cours un jour férié.";

    // Check lunch break (12:00 - 13:00)
    const lunchStart = setMinutes(setHours(new Date(start), 12), 0);
    const lunchEnd = setMinutes(setHours(new Date(start), 13), 0);
    if (start < lunchEnd && end > lunchStart) return "Conflit avec la pause déjeuner (12h-13h).";

    for (const event of events) {
      if (excludeEventId && event.id === excludeEventId) continue;
      
      const eventStart = parseISO(event.start);
      const eventEnd = parseISO(event.end);
      
      const overlaps = (start < eventEnd && end > eventStart);
      
      if (overlaps) {
        if (event.extendedProps.teacherId === teacherId) return `Le professeur est déjà pris à cet horaire.`;
        if (event.extendedProps.classId === classId) return `La classe a déjà cours à cet horaire.`;
        if (roomId && event.extendedProps.roomId === roomId) return `La salle est déjà occupée à cet horaire.`;
      }
    }
    return null; // No conflict
  };

  const handleEventReceive = async (info: any) => {
    const { event } = info;
    const start = event.start;
    const end = event.end;
    const props = event.extendedProps;

    const conflictError = checkConflicts(start, end, props.teacherId, props.classId, props.roomId);
    
    if (conflictError) {
      info.revert();
      setErrorMsg(conflictError);
      setTimeout(() => setErrorMsg(""), 5000);
      return;
    }

    setLoading(true);
    try {
      const occurrences = config.periodicity === "none" ? 1 : config.occurrences;
      const intervalWeeks = config.periodicity === "weekly" ? 1 : (config.periodicity === "1/4" ? 4 : 1);

      const creations = [];
      
      for (let i = 0; i < occurrences; i++) {
        const nextStart = new Date(start);
        nextStart.setDate(start.getDate() + (i * intervalWeeks * 7));
        const nextEnd = new Date(end);
        nextEnd.setDate(end.getDate() + (i * intervalWeeks * 7));

        const conflictError = checkConflicts(nextStart, nextEnd, props.teacherId, props.classId, props.roomId);
        if (conflictError) {
          info.revert();
          setErrorMsg(`Conflit à l'occurrence ${i+1} (${format(nextStart, 'dd/MM')}): ${conflictError}`);
          setTimeout(() => setErrorMsg(""), 5000);
          setLoading(false);
          return;
        }

        creations.push({
          startTime: nextStart.toISOString(),
          endTime: nextEnd.toISOString(),
          subjectId: props.subjectId,
          teacherId: props.teacherId,
          classId: props.classId,
          roomId: props.roomId || null
        });
      }

      // We could batch this, but for now let's just loop or update API to handle multiple
      // For simplicity and to avoid API changes now, let's just do them sequentially or promise.all
      await Promise.all(creations.map(payload => 
        fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ));
      
      fetchLessons(currentDate);
      info.revert();
    } catch (err) {
      info.revert();
      setErrorMsg("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = async (info: any) => {
    const { event, revert } = info;
    const start = event.start;
    const end = event.end;
    const props = event.extendedProps;

    const conflictError = checkConflicts(start, end, props.teacherId, props.classId, props.roomId, event.id);
    
    if (conflictError) {
      revert();
      setErrorMsg(conflictError);
      setTimeout(() => setErrorMsg(""), 5000);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: event.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };

      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        revert();
        setErrorMsg("Erreur lors de la modification.");
      }
    } catch (err) {
      revert();
      setErrorMsg("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (info: any) => {
    const { event } = info;
    const props = event.extendedProps;
    setSelectedEvent(event);
    setEventFormData({
      isCancelled: props.isCancelled || false,
      substituteId: props.substituteId || ""
    });
  };

  const handleUpdateEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setLoading(true);
    try {
      const payload = {
        id: selectedEvent.id,
        isCancelled: eventFormData.isCancelled,
        substituteId: eventFormData.substituteId || null
      };

      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSelectedEvent(null);
        fetchLessons(currentDate);
      } else {
        alert("Erreur lors de la modification.");
      }
    } catch (err) {
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedEvent = async () => {
    if (!selectedEvent) return;
    if (confirm(`Voulez-vous vraiment supprimer ce cours ?`)) {
      setLoading(true);
      try {
        const res = await fetch(`/api/lessons?id=${selectedEvent.id}`, { method: 'DELETE' });
        if (res.ok) {
          selectedEvent.remove();
          setEvents(events.filter(e => e.id !== selectedEvent.id));
          setSelectedEvent(null);
        }
      } catch (err) {
        alert("Erreur de suppression");
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter events based on selected view
  const visibleEvents = events.filter(e => {
    // Background events (lunch, holidays) are always visible
    if (e.extendedProps?.type === 'break' || e.extendedProps?.type === 'holiday' || e.extendedProps?.type === 'holiday-label') return true;
    
    if (!viewFilter.id) return true;
    if (viewFilter.type === 'class') return e.extendedProps.classId === viewFilter.id;
    if (viewFilter.type === 'teacher') return e.extendedProps.teacherId === viewFilter.id;
    if (viewFilter.type === 'room') return e.extendedProps.roomId === viewFilter.id;
    return true;
  });

  // Calculate Stats
  const calculateStats = () => {
    const stats: any = { teachers: {}, classes: {} };
    events.forEach(e => {
      const start = parseISO(e.start);
      const end = parseISO(e.end);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      const tName = e.extendedProps.teacher;
      const cName = e.extendedProps.class;

      if (!stats.teachers[tName]) stats.teachers[tName] = 0;
      stats.teachers[tName] += durationHours;

      if (!stats.classes[cName]) stats.classes[cName] = 0;
      stats.classes[cName] += durationHours;
    });
    return stats;
  };
  const stats = calculateStats();

  const isConfigComplete = config.teacherId && config.subjectId && config.classId;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 items-stretch min-h-0 font-sans text-slate-900">
      
      {/* LEFT COLUMN: Config & Draggable (4 cols equivalent) */}
      <div className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">1. Configuration</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Préparation du cours</p>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Classe *</label>
            <select className="w-full text-xs rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20" value={config.classId} onChange={e => setConfig({...config, classId: e.target.value})}>
              <option value="">-- Choisir --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Professeur *</label>
            <select className="w-full text-xs rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20" value={config.teacherId} onChange={e => {
              // Reset subject when teacher changes
              setConfig({...config, teacherId: e.target.value, subjectId: ""});
            }}>
              <option value="">-- Choisir --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Matière *</label>
            <select className="w-full text-xs rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20" value={config.subjectId} onChange={e => setConfig({...config, subjectId: e.target.value})}>
              <option value="">-- Choisir --</option>
              {selectedTeacher ? selectedTeacher.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedTeacher && selectedTeacher.subjects.length === 0 && (
              <p className="text-[8px] font-bold text-orange-600 mt-1 uppercase">Aucune matière assignée.</p>
            )}
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Salle</label>
            <select className="w-full text-xs rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20" value={config.roomId} onChange={e => setConfig({...config, roomId: e.target.value})}>
              <option value="">-- Aucune --</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
               <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Durée</label>
               <select className="w-full text-xs rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20" value={config.duration} onChange={e => setConfig({...config, duration: e.target.value})}>
                 <option value="01:00">1h</option>
                 <option value="01:30">1h30</option>
                 <option value="02:00">2h</option>
                 <option value="03:00">3h</option>
                 <option value="04:00">4h</option>
               </select>
            </div>
            <div>
               <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rythme</label>
               <select className="w-full text-xs rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20" value={config.periodicity} onChange={e => setConfig({...config, periodicity: e.target.value})}>
                 <option value="none">Une fois</option>
                 <option value="weekly">Hebdo</option>
                 <option value="1/4">1/4 sem.</option>
               </select>
            </div>
          </div>
          {config.periodicity !== "none" && (
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Occurrences</label>
              <input 
                type="number" 
                min="1" 
                max="52"
                className="w-full text-xs rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20" 
                value={config.occurrences} 
                onChange={e => setConfig({...config, occurrences: parseInt(e.target.value) || 1})}
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-100" id="external-events">
            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-3">2. Glisser & Déposer</h3>
            {isConfigComplete ? (
              <div 
                className="fc-event cursor-grab active:cursor-grabbing p-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition transform hover:-translate-y-0.5"
                data-duration={config.duration}
                data-props={JSON.stringify({
                  teacherId: config.teacherId,
                  subjectId: config.subjectId,
                  classId: config.classId,
                  roomId: config.roomId,
                  teacher: `${selectedTeacher?.lastName} ${selectedTeacher?.firstName}`,
                  subject: selectedSubject?.name,
                  class: selectedClass?.name,
                  room: selectedRoom?.name
                })}
              >
                <div className="font-black text-xs uppercase truncate">{selectedSubject?.name}</div>
                <div className="text-[9px] font-bold text-blue-100 mt-1 uppercase tracking-tighter">{selectedTeacher?.lastName} • {selectedClass?.name}</div>
                {selectedRoom && <div className="text-[8px] font-black bg-blue-800/50 inline-block px-1.5 py-0.5 rounded-md mt-1 uppercase tracking-widest">{selectedRoom.name}</div>}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-widest text-center leading-relaxed">
                Remplissez les champs requis (*) pour activer.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE COLUMN: Calendar */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <span className="px-4 py-2 bg-slate-900 text-white rounded-xl shadow-xl font-black text-[10px] uppercase tracking-widest animate-pulse">Sync...</span>
          </div>
        )}
        {errorMsg && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-red-600 text-white px-4 py-2 rounded-xl shadow-xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top duration-300">
            {errorMsg}
          </div>
        )}
        
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Affichage :</span>
          <div className="flex gap-1">
             <select 
               className="text-[10px] font-black uppercase tracking-widest rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20 bg-white"
               value={viewFilter.type}
               onChange={(e) => setViewFilter({ type: e.target.value, id: "" })}
             >
               <option value="class">Classe</option>
               <option value="teacher">Prof</option>
               <option value="room">Salle</option>
               <option value="all">Tout</option>
             </select>

             {viewFilter.type === 'class' && (
               <select className="text-[10px] font-black uppercase tracking-widest rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20 bg-white" value={viewFilter.id} onChange={e => setViewFilter({...viewFilter, id: e.target.value})}>
                 <option value="">Choisir...</option>
                 {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             )}
             {viewFilter.type === 'teacher' && (
               <select className="text-[10px] font-black uppercase tracking-widest rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20 bg-white" value={viewFilter.id} onChange={e => setViewFilter({...viewFilter, id: e.target.value})}>
                 <option value="">Choisir...</option>
                 {teachers.map(t => <option key={t.id} value={t.id}>{t.lastName}</option>)}
               </select>
             )}
             {viewFilter.type === 'room' && (
               <select className="text-[10px] font-black uppercase tracking-widest rounded-xl border-slate-200 py-1.5 focus:ring-blue-500/20 bg-white" value={viewFilter.id} onChange={e => setViewFilter({...viewFilter, id: e.target.value})}>
                 <option value="">Choisir...</option>
                 {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
               </select>
             )}
          </div>
        </div>

        <div className="flex-1 p-2 overflow-hidden min-h-0" id="calendar-container">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locales={[frLocale]}
            locale="fr"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            hiddenDays={[0, 6]} // Hide Sunday (0) and Saturday (6)
            height="100%"
            editable={true} // Allow drag to move, resize
            droppable={true} // Allow dropping external events
            events={visibleEvents}
            datesSet={(arg) => {
              if (currentDate.getTime() !== arg.view.currentStart.getTime()) {
                setCurrentDate(arg.view.currentStart);
              }
            }}
            eventReceive={handleEventReceive}
            eventDrop={handleEventChange}
            eventResize={handleEventChange}
            eventClick={handleEventClick}
            eventContent={(arg) => {
              const { extendedProps } = arg.event;
              
              if (extendedProps?.type === 'holiday' || extendedProps?.type === 'break') {
                return null;
              }

              if (extendedProps?.type === 'holiday-label') {
                return (
                  <div className="flex items-center justify-center h-full text-lg font-black opacity-20 rotate-12 pointer-events-none uppercase tracking-widest text-red-600">
                    {arg.event.title}
                  </div>
                );
              }

              const isCancelled = extendedProps?.isCancelled;
              const hasSubstitute = !!extendedProps?.substituteId;

              // If viewing by class, show teacher. If viewing by teacher, show class.
              let subtitle = extendedProps?.teacher;
              if (viewFilter.type === 'teacher') subtitle = extendedProps?.class;
              
              return (
                <div className={`flex flex-col text-[10px] leading-tight p-1 overflow-hidden w-full h-full text-white ${isCancelled ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-1 flex-wrap mb-0.5">
                    <span className={`font-black truncate ${isCancelled ? 'line-through' : ''}`}>
                      {arg.event.title}
                    </span>
                    {isCancelled && (
                      <span className="bg-white text-red-700 text-[7px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Off</span>
                    )}
                    {hasSubstitute && !isCancelled && (
                      <span className="bg-white text-amber-700 text-[7px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Sub</span>
                    )}
                  </div>
                  <span className={`truncate text-[9px] font-bold opacity-90 ${isCancelled ? 'line-through' : ''}`}>{subtitle}</span>
                  {hasSubstitute && !isCancelled && (
                    <span className="truncate font-black text-amber-200 text-[8px] uppercase tracking-tighter">Par: {extendedProps.substitute}</span>
                  )}
                  {extendedProps?.room && !isCancelled && <span className="truncate text-[8px] font-black uppercase tracking-widest opacity-70 mt-auto">{extendedProps.room}</span>}
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Stats */}
      <div className="w-full lg:w-56 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">3. Indicateurs</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Semaine en cours</p>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
          <div>
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Par Classe</h3>
            <ul className="space-y-2">
              {Object.entries(stats.classes).sort((a: any, b: any) => b[1] - a[1]).map(([name, hours]: any) => (
                <li key={name} className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-600 truncate pr-2 uppercase">{name}</span>
                  <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums">{hours}h</span>
                </li>
              ))}
              {Object.keys(stats.classes).length === 0 && <li className="text-[10px] text-slate-400 font-bold uppercase italic">Aucun</li>}
            </ul>
          </div>
          
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Par Prof</h3>
            <ul className="space-y-2">
              {Object.entries(stats.teachers).sort((a: any, b: any) => b[1] - a[1]).map(([name, hours]: any) => (
                <li key={name} className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-600 truncate pr-2 uppercase">{name}</span>
                  <span className="font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums">{hours}h</span>
                </li>
              ))}
              {Object.keys(stats.teachers).length === 0 && <li className="text-[10px] text-slate-400 font-bold uppercase italic">Aucun</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Détails du cours</h2>
              <button onClick={() => setSelectedEvent(null)} className="h-7 w-7 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition shadow-sm">&times;</button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 pb-4 border-b border-slate-100">
                <div className="font-black text-lg text-slate-900 leading-tight">{selectedEvent.extendedProps.subject}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedEvent.extendedProps.teacher} • {selectedEvent.extendedProps.class}</div>
                <div className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-widest">{format(selectedEvent.start, 'dd/MM HH:mm')} - {format(selectedEvent.end, 'HH:mm')}</div>
              </div>

              <form onSubmit={handleUpdateEventDetails} className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition group">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded-lg border-slate-300 text-red-600 focus:ring-red-500"
                    checked={eventFormData.isCancelled}
                    onChange={(e) => setEventFormData({...eventFormData, isCancelled: e.target.checked})}
                  />
                  <div>
                    <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Annuler le cours</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">S'affiche en rouge pour les élèves</div>
                  </div>
                </label>

                {!eventFormData.isCancelled && (
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Remplaçant</label>
                    <select 
                      className="w-full text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-500/20"
                      value={eventFormData.substituteId}
                      onChange={(e) => setEventFormData({...eventFormData, substituteId: e.target.value})}
                    >
                      <option value="">-- Aucun --</option>
                      {teachers.filter(t => t.id !== selectedEvent.extendedProps.teacherId).map(t => (
                        <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 flex flex-col gap-2">
                  <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50">
                    Mettre à jour
                  </button>
                  <button type="button" onClick={handleDeleteSelectedEvent} className="w-full py-2 text-red-600 hover:bg-red-50 rounded-xl text-[9px] font-black uppercase tracking-widest transition">
                    Supprimer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
