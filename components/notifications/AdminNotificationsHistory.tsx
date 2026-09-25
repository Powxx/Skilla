"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Trash2, 
  Users, 
  UserCheck, 
  GraduationCap, 
  Building2, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers,
  Search
} from "lucide-react";
import { deleteAdminNotification } from "@/app/actions/notifications";

export type AdminNotificationRecord = {
  key: string;
  ids: string[];
  title: string;
  message: string;
  type: string;
  createdAt: string;
  senderName: string;
  recipientLabel: string;
  recipientCount: number;
  recipientType: "TEACHER_GROUP" | "TEACHER_SINGLE" | "STUDENT_GROUP" | "STUDENT_SINGLE";
};

export type ClassLogRecord = {
  id: string;
  createdAt: string;
  senderName: string;
  className: string;
  title: string;
  message: string;
};

interface AdminNotificationsHistoryProps {
  adminLogs: AdminNotificationRecord[];
  classLogs: ClassLogRecord[];
  onDeleteClassLog: (id: string) => Promise<void>;
}

export default function AdminNotificationsHistory({
  adminLogs,
  classLogs,
  onDeleteClassLog,
}: AdminNotificationsHistoryProps) {
  const [tab, setTab] = useState<"ADMIN" | "CLASSES">("ADMIN");
  const [search, setSearch] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredAdminLogs = adminLogs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.title.toLowerCase().includes(q) ||
      log.message.toLowerCase().includes(q) ||
      log.recipientLabel.toLowerCase().includes(q)
    );
  });

  const filteredClassLogs = classLogs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.title.toLowerCase().includes(q) ||
      log.message.toLowerCase().includes(q) ||
      log.className.toLowerCase().includes(q) ||
      log.senderName.toLowerCase().includes(q)
    );
  });

  const handleDeleteAdminNotif = async (ids: string[]) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette notification ?")) return;
    setIsDeleting(ids[0]);
    try {
      for (const id of ids) {
        await deleteAdminNotification(id);
      }
    } catch (err) {
      alert("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteClassLog = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée d'historique ?")) return;
    setIsDeleting(id);
    try {
      await onDeleteClassLog(id);
    } catch (err) {
      alert("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(null);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            Important
          </span>
        );
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Succès
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-3 w-3" />
            Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="h-3 w-3" />
            Info
          </span>
        );
    }
  };

  const getRecipientIcon = (recipientType: string) => {
    switch (recipientType) {
      case "TEACHER_GROUP":
        return <Users className="h-3.5 w-3.5 text-indigo-600" />;
      case "TEACHER_SINGLE":
        return <UserCheck className="h-3.5 w-3.5 text-indigo-600" />;
      case "STUDENT_GROUP":
        return <Building2 className="h-3.5 w-3.5 text-sky-600" />;
      default:
        return <GraduationCap className="h-3.5 w-3.5 text-sky-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Navigation entre onglets d'historique */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Historique des notifications
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des envois de l'administration et des annonces de classes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer l'historique..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 w-44 sm:w-56"
            />
          </div>

          <div className="flex items-center p-1 bg-slate-200/60 rounded-xl">
            <button
              onClick={() => setTab("ADMIN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === "ADMIN"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Direction ({adminLogs.length})</span>
            </button>
            <button
              onClick={() => setTab("CLASSES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === "CLASSES"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Classes ({classLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu : Onglet Notifications Administration */}
      {tab === "ADMIN" && (
        <div className="overflow-x-auto">
          {filteredAdminLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Aucune notification enregistrée</p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? "Aucun résultat ne correspond à votre recherche." : "Les notifications envoyées par l'administration apparaîtront ici."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Destinataire(s)</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Titre</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdminLogs.map((log) => {
                  const dateStr = format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: fr });
                  const isItemDeleting = isDeleting === log.ids[0];

                  return (
                    <tr key={log.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {dateStr}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-100">
                            {getRecipientIcon(log.recipientType)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {log.recipientLabel}
                            </div>
                            {log.recipientCount > 1 && (
                              <div className="text-[10px] text-slate-400">
                                {log.recipientCount} destinataires
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {getTypeBadge(log.type)}
                      </td>

                      <td className="py-4 px-4 font-semibold text-xs text-slate-900 max-w-[200px] truncate">
                        {log.title}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600 max-w-[280px] truncate">
                        {log.message}
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteAdminNotif(log.ids)}
                          disabled={isItemDeleting}
                          className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition"
                          title="Supprimer la notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Contenu : Onglet Notifications de Classes */}
      {tab === "CLASSES" && (
        <div className="overflow-x-auto">
          {filteredClassLogs.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Aucune annonce de classe</p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? "Aucun résultat ne correspond à votre recherche." : "Les annonces transmises à des classes apparaîtront ici."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Émetteur</th>
                  <th className="py-3 px-4">Classe ciblée</th>
                  <th className="py-3 px-4">Titre</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClassLogs.map((log) => {
                  const dateStr = format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: fr });
                  const isItemDeleting = isDeleting === log.id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {dateStr}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs font-bold text-slate-900">
                        {log.senderName}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-100">
                          <GraduationCap className="h-3 w-3" />
                          {log.className}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-semibold text-xs text-slate-900 max-w-[200px] truncate">
                        {log.title}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600 max-w-[280px] truncate">
                        {log.message}
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteClassLog(log.id)}
                          disabled={isItemDeleting}
                          className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition"
                          title="Supprimer l'entrée"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
