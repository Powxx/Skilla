"use client";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';

interface WeeklyCalendarProps {
  events: any[];
  onDateChange: (date: Date) => void;
}

export default function WeeklyCalendar({ events, onDateChange }: WeeklyCalendarProps) {
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
        eventClassNames="cursor-pointer hover:opacity-80 transition-opacity"
        eventClick={(info) => {
          alert(`Cours: ${info.event.title}\nProf: ${info.event.extendedProps.teacher}`);
        }}
      />
    </div>
  );
}