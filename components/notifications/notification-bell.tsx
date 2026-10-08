"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PushSubscriptionManager } from "./PushSubscriptionManager";
import { 
  X, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles,
  Bell
} from "lucide-react";

const typeConfig: Record<string, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }>; previewBorder: string }> = {
  INFO: {
    label: "Information",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Info,
    previewBorder: "border-l-blue-500",
  },
  WARNING: {
    label: "Avertissement / Important",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
    previewBorder: "border-l-amber-500",
  },
  SUCCESS: {
    label: "Succès / Félicitations",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    previewBorder: "border-l-emerald-500",
  },
  ERROR: {
    label: "Urgent / Alerte",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertCircle,
    previewBorder: "border-l-rose-500",
  },
};

const getTypeConfig = (type?: string) => {
  const normalized = (type || "INFO").toUpperCase();
  return typeConfig[normalized] || typeConfig.INFO;
};

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (session?.user?.id) {
      const data = await getNotifications((session.user as any).id);
      const count = await getUnreadCount((session.user as any).id);
      setNotifications(data);
      setUnreadCount(count);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const handleOpenNotification = async (notification: any) => {
    setSelectedNotification(notification);
    if (!notification.isRead) {
      await markAsRead(notification.id);
      fetchNotifications();
    }
  };

  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleMarkAllAsRead = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!session?.user?.id || isMarkingAll) return;

    setIsMarkingAll(true);
    // Mise à jour optimiste immédiate de l'affichage
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await markAllAsRead();
      await fetchNotifications();
    } catch (err) {
      console.error("Erreur lors du marquage des notifications comme lues:", err);
      await fetchNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition border border-slate-200"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-88 sm:w-96 min-w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition cursor-pointer px-2 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {isMarkingAll ? "Mise à jour..." : "Tout marquer lu"}
              </button>
            )}
          </div>

          <div className="max-h-[440px] min-h-[140px] overflow-y-auto custom-scrollbar p-3 space-y-2.5 bg-slate-50/30">
            {notifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Aucune notification</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Vous recevrez ici les annonces et alertes de l'établissement.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = getTypeConfig(n.type);
                const IconComponent = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleOpenNotification(n)}
                    className={`p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs border-l-4 ${cfg.previewBorder} space-y-1.5 transition-all cursor-pointer ${
                      !n.isRead ? "ring-2 ring-blue-500/20 bg-blue-50/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {n.senderName || "Administration"}
                        </span>
                        {n.createdAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            · {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {n.isLinkedNotification && (
                          <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">
                            Prof
                          </span>
                        )}
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" title="Non lu" />
                        )}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${cfg.badgeClass}`}>
                          <IconComponent className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[95px]">{cfg.label}</span>
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                      {n.title}
                    </h4>

                    <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-2 leading-relaxed break-words">
                      {n.message}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Push Web & In-app</span>
                      <span className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                        Lire le message →
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <PushSubscriptionManager />
        </div>
      )}

      {/* Modal de lecture complète - Rendu identique à l'aperçu administrateur */}
      {mounted && selectedNotification && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-xl min-w-[320px] max-h-[88vh] my-auto shadow-2xl relative flex flex-col overflow-hidden border border-slate-100">
            {/* Barre d'en-tête de la modal */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 shrink-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Notification reçue
              </span>
              <button 
                onClick={() => setSelectedNotification(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Carte notification avec le rendu exact de l'aperçu administrateur */}
            {(() => {
              const cfg = getTypeConfig(selectedNotification.type);
              const IconComponent = cfg.icon;
              return (
                <div className={`p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50/50 border-l-4 ${cfg.previewBorder} space-y-3.5 shadow-xs flex-1 flex flex-col overflow-hidden`}>
                  {/* Expéditeur + Date + Badge de type */}
                  <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {selectedNotification.senderName || "Administration"}
                      </span>
                      {selectedNotification.createdAt && (
                        <span className="text-xs text-slate-400">
                          · {formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 shadow-xs ${cfg.badgeClass}`}>
                      <IconComponent className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Titre */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words shrink-0">
                    {selectedNotification.title}
                  </h3>

                  {/* Message avec défilement fluide et préservation des retours à la ligne */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar my-1 pr-2 text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed select-text min-h-[90px] max-h-[46vh]">
                    {selectedNotification.message}
                  </div>

                  {/* Bas de carte */}
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span>Canal :</span>
                      <span className="font-semibold text-slate-600">Push Web & In-app</span>
                    </span>
                    <span className="text-slate-500 font-medium">
                      {selectedNotification.isRead ? "✓ Lu" : "Nouveau"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Actions au bas de la modal */}
            <div className="pt-4 mt-2 flex flex-col sm:flex-row gap-2 shrink-0">
              {selectedNotification.link && (
                <a
                  href={selectedNotification.link}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition text-center shadow-sm flex items-center justify-center gap-1.5"
                  onClick={() => setSelectedNotification(null)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir le lien associé
                </a>
              )}
              <button 
                onClick={() => setSelectedNotification(null)} 
                className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
