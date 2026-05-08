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
    <div className="calendar-container h-full">
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
        height="100%"
        expandRows={true}
        selectable={editable}
        select={onDateSelect}
        eventClassNames="cursor-pointer hover:opacity-80 transition-opacity rounded-lg overflow-hidden border-none shadow-sm"
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
              <div className="flex items-center justify-center h-full text-[9px] font-black text-slate-400 opacity-30 uppercase tracking-[0.2em]">
                Pause
              </div>
            );
          }

          const isCancelled = extendedProps.isCancelled;
          const hasSubstitute = !!extendedProps.substituteId;

          return (
            <div className={`flex flex-col text-[10px] leading-tight p-1.5 overflow-hidden h-full ${isCancelled ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1 flex-wrap mb-0.5">
                <span className={`font-black truncate ${isCancelled ? 'line-through' : ''}`}>
                  {arg.event.title}
                </span>
                {isCancelled && (
                  <span className="bg-white/90 text-red-700 text-[7px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Off</span>
                )}
                {hasSubstitute && !isCancelled && (
                  <span className="bg-white/90 text-amber-700 text-[7px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Sub</span>
                )}
              </div>
              <div className="mt-auto space-y-0.5">
                <p className={`truncate text-[9px] font-bold opacity-80 ${isCancelled ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {extendedProps.teacher}
                </p>
                {extendedProps.room && !isCancelled && (
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{extendedProps.room}</p>
                )}
                {hasSubstitute && !isCancelled && (
                  <p className="truncate font-black text-amber-900 text-[8px] uppercase tracking-tighter">Par: {extendedProps.substitute}</p>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}