"use client";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from '@fullcalendar/core/locales/fr';
import { useState } from "react";
import { useSession } from "next-auth/react";
import { getCalendarToken } from "@/app/actions/settings";
import { Calendar, Download, Link2, Check, Copy } from "lucide-react";

interface WeeklyCalendarProps {
  events: any[];
  onDateChange: (date: Date) => void;
  onEventClick?: (info: any) => void;
  onDateSelect?: (info: any) => void;
  editable?: boolean;
}

export default function WeeklyCalendar({ events, onDateChange, onEventClick, onDateSelect, editable = false }: WeeklyCalendarProps) {
  const { data: session } = useSession();
  const [showExportModal, setShowExportModal] = useState(false);
  const [syncUrl, setSyncUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleExportClick = async () => {
    setShowExportModal(true);
    if (!syncUrl && session?.user?.id) {
      try {
        const token = await getCalendarToken(session.user.id);
        const url = `${window.location.origin}/api/calendar/sync/${token}`;
        setSyncUrl(url);
      } catch (err) {
        console.error("Failed to get sync token", err);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.open('/api/calendar/export', '_blank');
  };

  return (
    <div className="calendar-container h-full min-h-[700px] relative">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locales={[frLocale]}
        locale="fr"
        customButtons={{
          export: {
            text: 'Exporter...',
            click: handleExportClick
          }
        }}
        headerToolbar={{
          left: "prev,next today export",
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
            return {
              html: `<div class="flex items-center justify-center h-full text-lg font-black opacity-20 rotate-12 pointer-events-none uppercase tracking-widest text-red-600">
                ${arg.event.title}
              </div>`
            };
          }

          const isCancelled = extendedProps?.isCancelled;
          const hasSubstitute = !!extendedProps?.substituteId;

          return {
             html: `<div class="flex flex-col text-[10px] leading-tight p-1.5 overflow-hidden h-full text-white ${isCancelled ? 'opacity-60' : ''}">
              <div class="flex items-center gap-1 flex-wrap mb-0.5">
                <span class="font-black truncate ${isCancelled ? 'line-through' : ''}">
                  ${arg.event.title || 'Cours'}
                </span>
                ${isCancelled ? '<span class="bg-white text-red-700 text-[7px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Off</span>' : ''}
                ${hasSubstitute && !isCancelled ? '<span class="bg-white text-amber-700 text-[7px] px-1 rounded font-black uppercase tracking-tighter shadow-sm">Sub</span>' : ''}
              </div>
              <div class="mt-auto space-y-0.5">
                <p class="truncate text-[9px] font-bold opacity-90 ${isCancelled ? 'line-through' : ''}">
                  ${extendedProps?.teacher || ''}
                </p>
                ${extendedProps?.room && !isCancelled ? `<p class="text-[8px] font-black uppercase tracking-widest opacity-70">${extendedProps.room}</p>` : ''}
                ${hasSubstitute && !isCancelled ? `<p class="truncate font-black text-amber-200 text-[8px] uppercase tracking-tighter">Par: ${extendedProps.substitute}</p>` : ''}
              </div>
            </div>`
          };
        }}
      />

      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Exporter mon planning
              </h2>
              <button 
                onClick={() => setShowExportModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Option 1: Direct Download */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Téléchargement direct
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Téléchargez un fichier .ics contenant vos cours des 6 prochains mois. 
                  Idéal pour un import manuel ponctuel.
                </p>
                <button 
                  onClick={handleDownload}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  Télécharger le fichier .ics
                </button>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Option 2: Live Sync */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Synchronisation en direct
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Utilisez ce lien pour vous abonner dans Google Calendar, Apple Calendar ou Outlook. 
                  Vos cours se mettront à jour automatiquement.
                </p>
                <div className="flex gap-2">
                  <input 
                    readOnly
                    value={syncUrl || "Génération du lien..."}
                    className="flex-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-mono"
                  />
                  <button 
                    onClick={copyToClipboard}
                    disabled={!syncUrl}
                    className={`px-3 rounded-lg flex items-center justify-center transition ${copied ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Conseil : Dans Google Calendar, cliquez sur "+" à côté de "Autres agendas" > "À partir de l'URL".
                </p>
              </div>

              <button 
                onClick={() => setShowExportModal(false)}
                className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition mt-4"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}