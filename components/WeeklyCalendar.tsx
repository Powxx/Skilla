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
        datesSet={(arg) => onDateChange(arg.start)}
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
          if (onEventClick) {
            onEventClick(info);
          } else {
            alert(`Cours: ${info.event.title}\nProf: ${info.event.extendedProps.teacher}`);
          }
        }}
      />
    </div>
  );
}