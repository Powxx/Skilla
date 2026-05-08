"use client";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';

interface WeeklyCalendarProps {
  events: any[];
  onDateChange: (date: Date) => void;
  onEventClick?: (info: any) => void;
  onDateSelect?: (info: any) => void;
  editable?: boolean;
}

export default function WeeklyCalendar({ events, onDateChange, onEventClick, onDateSelect, editable = false }: WeeklyCalendarProps) {
  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locales={[frLocale]}
        locale="fr"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        datesSet={(arg) => {
          if (onDateChange) {
            onDateChange(arg.start);
          }
        }}
        slotMinTime="08:00:00"
        slotMaxTime="19:00:00"
        allDaySlot={false}
        weekends={false}
        events={events}
        height="650px"
        expandRows={true}
        selectable={editable}
        select={onDateSelect}
        eventClassNames="cursor-pointer hover:opacity-80 transition-opacity"
        eventClick={(info) => {
          if (info.event.extendedProps.type === 'holiday' || info.event.extendedProps.type === 'break' || info.event.extendedProps.type === 'holiday-label') return;
          if (onEventClick) {
            onEventClick(info);
          } else {
            alert(`Cours: ${info.event.title}\nProf: ${info.event.extendedProps.teacher}`);
          }
        }}
        eventContent={(arg) => {
          const { extendedProps } = arg.event;
          
          if (extendedProps.type === 'holiday-label') {
            return (
              <div className="flex items-center justify-center h-full text-lg font-black opacity-30 rotate-12 pointer-events-none uppercase tracking-widest text-red-500">
                {arg.event.title}
              </div>
            );
          }

          if (extendedProps.type === 'break') {
            return (
              <div className="flex items-center justify-center h-full text-[10px] font-bold text-slate-400 opacity-50 uppercase tracking-tighter">
                Pause
              </div>
            );
          }

          const isCancelled = extendedProps.isCancelled;
          const hasSubstitute = !!extendedProps.substituteId;

          return (
            <div className={`flex flex-col text-[10px] leading-tight p-0.5 overflow-hidden h-full ${isCancelled ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`font-bold truncate ${isCancelled ? 'line-through' : ''}`}>
                  {arg.event.title}
                </span>
                {isCancelled && (
                  <span className="bg-white/80 text-red-700 text-[8px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Annulé</span>
                )}
                {hasSubstitute && !isCancelled && (
                  <span className="bg-white/80 text-amber-700 text-[8px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Remplacé</span>
                )}
              </div>
              <span className={`truncate opacity-90 ${isCancelled ? 'line-through' : ''}`}>
                {extendedProps.teacher}
              </span>
              {hasSubstitute && !isCancelled && (
                <span className="truncate font-bold text-amber-900 mt-auto">Par: {extendedProps.substitute}</span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}