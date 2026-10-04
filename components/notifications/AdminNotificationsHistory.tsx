"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
  Search,
  Eye,
  X,
  Sparkles,
  Calendar,
  Check,
  Loader2,
  CalendarClock,
  ShieldCheck
} from "lucide-react";
import { deleteAdminNotification, getAdminNotificationReceipts } from "@/app/actions/notifications";

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
  recipientType: "TEACHER_GROUP" | "TEACHER_SINGLE" | "STUDENT_GROUP" | "STUDENT_SINGLE" | "PARENT_GROUP" | "TUTOR_GROUP";
  readCount?: number;
  readRate?: number;
};

export type ClassLogRecord = {
  id: string;
  createdAt: string;
  senderName: string;
  className: string;
  title: string;
  message: string;
};

export type ScheduledNotificationRecord = {
  id: string;
  title: string;
  message: string;
  type: string;
  target: string;
  scheduledFor: string;
  createdAt: string;
  status: string;
  senderName: string;
};

interface AdminNotificationsHistoryProps {
  adminLogs: AdminNotificationRecord[];
  classLogs: ClassLogRecord[];
  scheduledLogs?: ScheduledNotificationRecord[];
  onDeleteClassLog: (id: string) => Promise<void>;
  onCancelScheduledLog?: (id: string) => Promise<void>;
}

export default function AdminNotificationsHistory({
  adminLogs,
  classLogs,
  scheduledLogs = [],
  onDeleteClassLog,
  onCancelScheduledLog,
}: AdminNotificationsHistoryProps) {
  const [tab, setTab] = useState<"ADMIN" | "CLASSES" | "SCHEDULED">("ADMIN");
  const [search, setSearch] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Message preview modal
  const [viewModalData, setViewModalData] = useState<{
    title: string;
    message: string;
    date: string;
    target: string;
    sender?: string;
    type?: string;
  } | null>(null);

  // Point 2 : Accusés de réception modal
  const [receiptsModalData, setReceiptsModalData] = useState<{
    title: string;
    total: number;
    readCount: number;
    readRate: number;
    recipients: {
      id: string;
      userId: string;
      name: string;
      role: string;
      className: string | null;
      isRead: boolean;
      readAt: string | null;
    }[];
  } | null>(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptFilter, setReceiptFilter] = useState<"ALL" | "READ" | "UNREAD">("ALL");
  const [receiptSearch, setReceiptSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const filteredScheduledLogs = scheduledLogs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.title.toLowerCase().includes(q) ||
      log.message.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q)
    );
  });

  const handleDeleteAdminNotif = async (ids: string[]) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette notification ?")) return;
    setIsDeleting(ids[0]);
    try {
      for (const id of ids) {
        await deleteAdminNotification(id);
      }
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteClassLog = async (id: string) => {
    if (!confirm("Supprimer l'historique de cette annonce ?")) return;
    setIsDeleting(id);
    try {
      await onDeleteClassLog(id);
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    if (!confirm("Voulez-vous vraiment annuler cette notification programmée ?")) return;
    if (onCancelScheduledLog) {
      await onCancelScheduledLog(id);
    }
  };

  // Point 2 : Ouvrir le modal d'accusés de réception
  const openReceiptsModal = async (log: AdminNotificationRecord) => {
    setReceiptsLoading(true);
    setReceiptFilter("ALL");
    setReceiptSearch("");
    try {
      const data = await getAdminNotificationReceipts(log.ids);
      setReceiptsModalData({
        title: log.title,
        ...data,
      });
    } catch (err) {
      console.error("Failed to load receipts", err);
      alert("Impossible de charger les accusés de réception.");
    } finally {
      setReceiptsLoading(false);
    }
  };

  const filteredRecipients = useMemo(() => {
    if (!receiptsModalData) return [];
    return receiptsModalData.recipients.filter((r) => {
      if (receiptFilter === "READ" && !r.isRead) return false;
      if (receiptFilter === "UNREAD" && r.isRead) return false;
      if (receiptSearch.trim()) {
        const q = receiptSearch.toLowerCase();
        return r.name.toLowerCase().includes(q) || (r.className && r.className.toLowerCase().includes(q));
      }
      return true;
    });
  }, [receiptsModalData, receiptFilter, receiptSearch]);

  const getTypeBadge = (type: string) => {
    const cfg = getTypeConfig(type);
    const IconComponent = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeClass}`}>
        <IconComponent className="h-3 w-3" />
        {cfg.label}
      </span>
    );
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
            Historique & Suivi des notifications
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des envois de la direction, accusés de lecture et programmations différées.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            <button
              onClick={() => setTab("SCHEDULED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === "SCHEDULED"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5 text-indigo-600" />
              <span>Programmées ({scheduledLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu : Onglet Notifications Administration */}
      {tab === "ADMIN" && (
        <div className="overflow-x-auto overflow-y-auto max-h-[620px] min-h-[280px] custom-scrollbar">
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
              <thead className="sticky top-0 bg-white/95 backdrop-blur z-10">
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Destinataires</th>
                  <th className="py-3 px-4">Accusés de lecture</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Titre</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdminLogs.map((log) => {
                  const dateStr = format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: fr });
                  const isItemDeleting = isDeleting === log.ids[0];

                  const openDetails = () => setViewModalData({
                    title: log.title,
                    message: log.message,
                    date: dateStr,
                    target: log.recipientLabel + (log.recipientCount > 1 ? ` (${log.recipientCount} destinataires)` : ''),
                    type: log.type
                  });

                  return (
                    <tr key={log.key} className="hover:bg-slate-50/70 transition-colors">
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

                      {/* Point 2 : Colonne Accusés de lecture */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-black ${
                              log.readRate === 100
                                ? "text-emerald-700"
                                : (log.readCount || 0) > 0
                                ? "text-blue-700"
                                : "text-slate-500"
                            }`}>
                              {log.readCount || 0}/{log.recipientCount} ({log.readRate || 0}%)
                            </span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                              style={{ width: `${log.readRate || 0}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => openReceiptsModal(log)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 text-left pt-0.5 hover:underline"
                          >
                            Détail accusés →
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {getTypeBadge(log.type)}
                      </td>

                      <td 
                        onClick={openDetails}
                        className="py-4 px-4 font-semibold text-xs text-slate-900 max-w-[200px] truncate cursor-pointer hover:text-blue-600 transition"
                        title="Cliquer pour afficher le texte complet"
                      >
                        {log.title}
                      </td>

                      <td 
                        onClick={openDetails}
                        className="py-4 px-4 text-xs text-slate-600 max-w-[260px] truncate cursor-pointer hover:text-slate-900 transition"
                        title="Cliquer pour afficher le texte complet"
                      >
                        {log.message}
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openDetails}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition p-1 hover:bg-slate-100 rounded-lg"
                            title="Consulter le message complet"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Détails</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAdminNotif(log.ids)}
                            disabled={isItemDeleting}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition p-1 hover:bg-rose-50 rounded-lg"
                            title="Supprimer la notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        </div>
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
        <div className="overflow-x-auto overflow-y-auto max-h-[620px] min-h-[280px] custom-scrollbar">
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
              <thead className="sticky top-0 bg-white/95 backdrop-blur z-10">
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Émetteur</th>
                  <th className="py-3 px-4">Classe ciblée</th>
                  <th className="py-3 px-4">Titre</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClassLogs.map((log) => {
                  const dateStr = format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: fr });
                  const isItemDeleting = isDeleting === log.id;

                  const openDetails = () => setViewModalData({
                    title: log.title,
                    message: log.message,
                    date: dateStr,
                    target: `Classe de ${log.className}`,
                    sender: log.senderName,
                    type: "INFO"
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {dateStr}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-bold text-slate-800">
                        {log.senderName}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {log.className}
                        </span>
                      </td>
                      <td 
                        onClick={openDetails}
                        className="py-4 px-4 font-semibold text-xs text-slate-900 max-w-[200px] truncate cursor-pointer hover:text-blue-600 transition"
                        title="Cliquer pour afficher le texte complet"
                      >
                        {log.title}
                      </td>
                      <td 
                        onClick={openDetails}
                        className="py-4 px-4 text-xs text-slate-600 max-w-[300px] truncate cursor-pointer hover:text-slate-900 transition"
                        title="Cliquer pour afficher le texte complet"
                      >
                        {log.message}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openDetails}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition p-1 hover:bg-slate-100 rounded-lg"
                            title="Consulter le message complet"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Détails</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClassLog(log.id)}
                            disabled={isItemDeleting}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition p-1 hover:bg-rose-50 rounded-lg"
                            title="Supprimer la notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Point 7 : Onglet Notifications Programmées */}
      {tab === "SCHEDULED" && (
        <div className="overflow-x-auto overflow-y-auto max-h-[620px] min-h-[280px] custom-scrollbar">
          {filteredScheduledLogs.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarClock className="h-8 w-8 text-indigo-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Aucun envoi programmé en attente</p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? "Aucun résultat ne correspond à votre recherche." : "Lorsque vous planifiez un envoi différé, il apparaîtra ici jusqu'à sa date d'expédition."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white/95 backdrop-blur z-10">
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-6">Date de tir prévue</th>
                  <th className="py-3 px-4">Cible</th>
                  <th className="py-3 px-4">Titre</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4">Planifié par</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScheduledLogs.map((item) => {
                  const scheduledDate = new Date(item.scheduledFor);
                  const scheduledStr = format(scheduledDate, "dd/MM/yyyy HH:mm", { locale: fr });
                  const isFuture = scheduledDate > new Date();

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap text-xs font-bold text-indigo-900">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{scheduledStr}</span>
                          <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border ${
                            isFuture ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {isFuture ? "En attente" : "En cours d'envoi"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs font-semibold text-slate-700">
                        {item.target}
                      </td>

                      <td className="py-4 px-4 font-bold text-xs text-slate-900 max-w-[200px] truncate">
                        {item.title}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600 max-w-[280px] truncate">
                        {item.message}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500">
                        {item.senderName}
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCancelScheduled(item.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                        >
                          <X className="w-3.5 h-3.5" />
                          Annuler l&apos;envoi
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

      {/* Point 2 : Modal Accusés de Réception */}
      {mounted && receiptsModalData && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl min-w-[320px] max-h-[85vh] my-auto shadow-2xl relative flex flex-col border border-slate-100 overflow-hidden">
            <button
              onClick={() => setReceiptsModalData(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 pr-10">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                Accusés de lecture & Distribution
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 truncate">
                {receiptsModalData.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vérification individuelle de la réception et de la lecture de la notification.
              </p>
            </div>

            {/* Stat Summary Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Taux de lecture
                  </span>
                  <span className="text-2xl font-black text-indigo-600">
                    {receiptsModalData.readRate}%
                  </span>
                </div>
                <div className="h-8 w-[1px] bg-slate-200" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Total envoyés
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {receiptsModalData.total}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {receiptsModalData.readCount} lu(s)
                </span>
                <span className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {receiptsModalData.total - receiptsModalData.readCount} non lu(s)
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un destinataire..."
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setReceiptFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    receiptFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tous ({receiptsModalData.total})
                </button>
                <button
                  onClick={() => setReceiptFilter("READ")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    receiptFilter === "READ" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Lus ({receiptsModalData.readCount})
                </button>
                <button
                  onClick={() => setReceiptFilter("UNREAD")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    receiptFilter === "UNREAD" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Non lus ({receiptsModalData.total - receiptsModalData.readCount})
                </button>
              </div>
            </div>

            {/* Recipients List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-2 pr-1 min-h-[160px]">
              {filteredRecipients.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Aucun destinataire correspondant aux filtres.
                </div>
              ) : (
                filteredRecipients.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      rec.isRead
                        ? "bg-emerald-50/40 border-emerald-100"
                        : "bg-slate-50/60 border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        rec.isRead ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        {rec.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{rec.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {rec.role} {rec.className ? `• ${rec.className}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {rec.isRead ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lu {rec.readAt ? format(new Date(rec.readAt), "le dd/MM à HH:mm", { locale: fr }) : ""}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Non lu</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setReceiptsModalData(null)}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Détails du message */}
      {mounted && viewModalData && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg min-w-[320px] max-h-[85vh] my-auto shadow-2xl relative flex flex-col border border-slate-100 overflow-hidden">
            <button
              onClick={() => setViewModalData(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 pr-10">
              <div className="flex items-center gap-2 mb-2">
                {getTypeBadge(viewModalData.type || "INFO")}
                <span className="text-xs text-slate-400 font-medium">
                  {viewModalData.date}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {viewModalData.title}
              </h2>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Destinataire(s) : {viewModalData.target}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar my-2 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed select-text min-h-[140px]">
              {viewModalData.message}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setViewModalData(null)}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
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
