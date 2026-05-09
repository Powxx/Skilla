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
    <div className="calendar-container h-full min-h-[700px]">
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
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        slotEventOverlap={false}
        allDaySlot={false}
        weekends={false}
        events={events}
        height={850}
        expandRows={true}
        selectable={editable}
        select={onDateSelect}
        eventMinHeight={40}
        eventClassNames="cursor-pointer hover:opacity-80 transition-opacity rounded-lg overflow-hidden border-none shadow-sm"
        eventClick={(info) => {
          if (info.event.extendedProps.type === 'holiday' || info.event.extendedProps.type === 'break' || info.event.extendedProps.type === 'holiday-label') return;
          if (onEventClick) {
            onEventClick(info);
          }
        }}
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

          return (
            <div className={`flex flex-col text-[10px] leading-tight p-1.5 overflow-hidden h-full text-white ${isCancelled ? 'opacity-60' : ''}`}>
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
              <div className="mt-auto space-y-0.5">
                <p className={`truncate text-[9px] font-bold opacity-90 ${isCancelled ? 'line-through' : ''}`}>
                  {extendedProps?.teacher}
                </p>
                {extendedProps?.room && !isCancelled && (
                   <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{extendedProps.room}</p>
                )}
                {hasSubstitute && !isCancelled && (
                  <p className="truncate font-black text-amber-200 text-[8px] uppercase tracking-tighter">Par: {extendedProps.substitute}</p>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}