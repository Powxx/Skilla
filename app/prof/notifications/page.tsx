import prisma from "@/lib/prisma";
import SendNotificationClient from "./notifications-client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, Inbox, AlertTriangle, CheckCircle2, AlertCircle, Info } from "lucide-react";

export default async function ProfNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER") redirect("/login");

  const [classes, receivedNotifications] = await Promise.all([
    prisma.class.findMany({ 
      orderBy: { name: "asc" },
      select: { id: true, name: true } 
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "WARNING":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          icon: AlertTriangle,
          border: "border-l-amber-500",
          label: "Important"
        };
      case "SUCCESS":
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
          border: "border-l-emerald-500",
          label: "Succès"
        };
      case "ERROR":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          icon: AlertCircle,
          border: "border-l-rose-500",
          label: "Urgent"
        };
      default:
        return {
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Info,
          border: "border-l-blue-500",
          label: "Info"
        };
    }
  };

  const unreadCount = receivedNotifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <Bell className="h-7 w-7 text-indigo-600" />
          Centre de notifications
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consultez les messages de la direction et diffusez des annonces à vos classes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulaire d'envoi aux classes (col 12 -> 5) */}
        <div className="lg:col-span-5 space-y-4">
          <SendNotificationClient classes={classes} />
        </div>

        {/* Notifications reçues par le professeur (col 12 -> 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Inbox className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Boîte de réception</h3>
                <p className="text-xs text-slate-500">Messages & alertes de l'administration</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm">
                {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {receivedNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Aucune notification reçue</p>
                <p className="text-xs text-slate-400 mt-1">
                  Les messages et consignes émis par la direction apparaîtront ici.
                </p>
              </div>
            ) : (
              receivedNotifications.map((notif) => {
                const style = getTypeStyle(notif.type);
                const IconComponent = style.icon;
                const formattedDate = format(new Date(notif.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr });

                return (
                  <div
                    key={notif.id}
                    className={`p-4 transition hover:bg-slate-50/80 border-l-4 ${style.border} ${
                      !notif.isRead ? "bg-indigo-50/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {notif.senderName || "Administration"}
                        </span>
                        <span className="text-[11px] text-slate-400">· {formattedDate}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                          <IconComponent className="h-3 w-3" />
                          {style.label}
                        </span>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600" title="Non lu" />
                        )}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-1">
                      {notif.title}
                    </h4>

                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
