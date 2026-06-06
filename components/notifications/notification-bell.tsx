"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PushSubscriptionManager } from "./PushSubscriptionManager";
import { X } from "lucide-react";

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleMarkAllAsRead = async () => {
    if (session?.user?.id) {
      await markAllAsRead((session.user as any).id);
      fetchNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition border border-slate-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden border border-slate-100">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center"><p className="text-xs text-slate-400">Aucune notification</p></div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition cursor-pointer ${!n.isRead ? "bg-blue-50/30" : ""}`}
                  onClick={() => handleOpenNotification(n)}
                >
                  <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
          <PushSubscriptionManager />
        </div>
      )}

      {/* Notification Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
            <button onClick={() => setSelectedNotification(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{selectedNotification.title}</h3>
            <p className="text-sm text-slate-600 mb-6">{selectedNotification.message}</p>
            <button onClick={() => setSelectedNotification(null)} className="w-full py-2 bg-slate-900 text-white rounded-xl font-medium text-sm">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
