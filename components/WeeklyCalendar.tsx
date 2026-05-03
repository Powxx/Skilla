"use client";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function WeeklyCalendar({ initialEvents }: { initialEvents: any[] }) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek" // Vue hebdomadaire avec heures
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        locale="fr"
        slotMinTime="08:00:00" // Début des cours
        slotMaxTime="19:00:00" // Fin des cours
        allDaySlot={false}
        weekends={false} // On cache le Samedi/Dimanche
        events={initialEvents} // Les données de ton API Prisma
        eventClick={(info) => alert("Cours de : " + info.event.title)}
        height="auto"
      />
    </div>
  );
}