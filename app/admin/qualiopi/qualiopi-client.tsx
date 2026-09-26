"use client";

import { useState, useTransition } from "react";
import { Star, MessageSquareWarning, Trash2, Send, ClipboardList, Power, ShieldCheck, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import {
  updateComplaintStatus,
  deleteComplaint,
  deleteSatisfactionSurvey,
  createSurveyCampaign,
  toggleSurveyCampaign,
  deleteSurveyCampaign,
  recordCorrectiveAction,
} from "@/app/actions/qualiopi";
import { SURVEY_TARGET_LABELS, ROLE_LABELS, COMPLAINT_STATUS_LABELS } from "@/lib/qualiopi";
import type { SatisfactionSurveyTarget } from "@prisma/client";

type Complaint = {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: Date | string;
  sender: { firstName: string | null; lastName: string | null; role: string };
};

type Survey = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  user: { firstName: string | null; lastName: string | null; role: string; class: { name: string } | null };
  campaign: { title: string; targetType: SatisfactionSurveyTarget } | null;
};

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  targetType: SatisfactionSurveyTarget;
  isActive: boolean;
  createdAt: Date | string;
  class: { name: string } | null;
  createdBy: { firstName: string | null; lastName: string | null };
  _count: { responses: number };
};

type ClassOption = { id: string; name: string };

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolue",
  CLOSED: "Fermée",
};

const TARGET_OPTIONS: SatisfactionSurveyTarget[] = [
  "STUDENT",
  "TEACHER",
  "RESPONSIBLE",
  "COMPANY_TUTOR",
  "CLASS",
];

type Props = {
  complaints: Complaint[];
  surveys: Survey[];
  campaigns: Campaign[];
  classes: ClassOption[];
};

export default function QualiopiClient({
  complaints: initialComplaints,
  surveys: initialSurveys,
  campaigns: initialCampaigns,
  classes,
}: Props) {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [surveys, setSurveys] = useState(initialSurveys);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [tab, setTab] = useState<"campaigns" | "complaints" | "surveys">("campaigns");
  const [isPending, startTransition] = useTransition();
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignSuccess, setCampaignSuccess] = useState<string | null>(null);

  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    targetType: "STUDENT" as SatisfactionSurveyTarget,
    classId: "",
  });

  const [selectedComplaintForAction, setSelectedComplaintForAction] = useState<Complaint | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleStatusChange = (id: string, status: string) => {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    startTransition(async () => {
      try {
        await updateComplaintStatus(id, status);
      } catch {
        setComplaints(initialComplaints);
      }
    });
  };

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintForAction || !actionNote.trim()) return;
    const complaintId = selectedComplaintForAction.id;
    startTransition(async () => {
      try {
        await recordCorrectiveAction({
          complaintId,
          actionNote,
          status: "RESOLVED",
        });
        setActionSuccess("Mesure corrective enregistrée et notifiée à l'usager.");
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === complaintId
              ? {
                  ...c,
                  status: "RESOLVED",
                  description: `${c.description}\n\n--- [ACTION CORRECTIVE QUALIOPI — ${new Date().toLocaleDateString("fr-FR")}] ---\n${actionNote.trim()}`,
                }
              : c
          )
        );
        setActionNote("");
        setTimeout(() => {
          setSelectedComplaintForAction(null);
          setActionSuccess(null);
        }, 1500);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDeleteComplaint = (id: string) => {
    if (!confirm("Supprimer cette réclamation ?")) return;
    setComplaints((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        await deleteComplaint(id);
      } catch {
        setComplaints(initialComplaints);
      }
    });
  };

  const handleDeleteSurvey = (id: string) => {
    if (!confirm("Supprimer cette réponse ?")) return;
    setSurveys((prev) => prev.filter((s) => s.id !== id));
    startTransition(async () => {
      try {
        await deleteSatisfactionSurvey(id);
      } catch {
        setSurveys(initialSurveys);
      }
    });
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignError(null);
    setCampaignSuccess(null);
    startTransition(async () => {
      try {
        const res = await createSurveyCampaign({
          title: newCampaign.title,
          description: newCampaign.description,
          targetType: newCampaign.targetType,
          classId: newCampaign.targetType === "CLASS" ? newCampaign.classId : undefined,
        });
        if (res.ok) {
          setCampaignSuccess(`Enquête envoyée à ${res.recipientCount} personne(s).`);
          setNewCampaign({ title: "", description: "", targetType: "STUDENT", classId: "" });
          window.location.reload();
        }
      } catch (err: unknown) {
        setCampaignError(err instanceof Error ? err.message : "Erreur lors de la création.");
      }
    });
  };

  const handleToggleCampaign = (id: string, isActive: boolean) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, isActive } : c)));
    startTransition(async () => {
      try {
        await toggleSurveyCampaign(id, isActive);
      } catch {
        setCampaigns(initialCampaigns);
      }
    });
  };

  const handleDeleteCampaign = (id: string) => {
    if (!confirm("Supprimer cette enquête et conserver les réponses détachées ?")) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        await deleteSurveyCampaign(id);
      } catch {
        setCampaigns(initialCampaigns);
      }
    });
  };

  const avgRating =
    surveys.length > 0 ? surveys.reduce((a, s) => a + s.rating, 0) / surveys.length : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Note moyenne</p>
          <div className="mt-2 flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
            <span className="text-3xl font-black">{avgRating != null ? avgRating.toFixed(1) : "—"}</span>
            <span className="text-slate-400 text-sm font-bold">/5</span>
          </div>
          <p className="text-[9px] text-slate-400 font-bold mt-1">{surveys.length} réponses</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Réclamations ouvertes</p>
          <p className="mt-2 text-3xl font-black text-amber-700">
            {complaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
          <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Enquêtes actives</p>
          <p className="mt-2 text-3xl font-black text-violet-700">
            {campaigns.filter((c) => c.isActive).length}
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto">
        {(["campaigns", "complaints", "surveys"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 -mb-[2px] transition whitespace-nowrap ${tab === t ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            {t === "campaigns" ? "Enquêtes" : t === "complaints" ? "Réclamations" : "Réponses"}
          </button>
        ))}
      </div>

      {tab === "campaigns" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-4">
              <Send className="h-4 w-4 text-violet-600" />
              Diffuser une enquête de satisfaction
            </h3>
            {campaignError && (
              <p className="mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{campaignError}</p>
            )}
            {campaignSuccess && (
              <p className="mb-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">{campaignSuccess}</p>
            )}
            <form onSubmit={handleCreateCampaign} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Titre *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-500"
                  placeholder="Ex : Satisfaction semestre 2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-violet-500"
                  placeholder="Contexte ou consignes pour les répondants..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Destinataires *</label>
                <select
                  value={newCampaign.targetType}
                  onChange={(e) => setNewCampaign({ ...newCampaign, targetType: e.target.value as SatisfactionSurveyTarget, classId: "" })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-violet-500"
                >
                  {TARGET_OPTIONS.map((t) => (
                    <option key={t} value={t}>{SURVEY_TARGET_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              {newCampaign.targetType === "CLASS" && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Classe *</label>
                  <select
                    required
                    value={newCampaign.classId}
                    onChange={(e) => setNewCampaign({ ...newCampaign, classId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-violet-500"
                  >
                    <option value="">— Choisir —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={`${newCampaign.targetType === "CLASS" ? "" : "sm:col-span-2"} flex items-end`}>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto px-6 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isPending ? "Envoi..." : "Diffuser l'enquête"}
                </button>
              </div>
            </form>
            <p className="text-[10px] text-slate-400 font-medium mt-4">
              Une notification sera envoyée à chaque destinataire avec un lien vers le formulaire de satisfaction.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5" /> Enquêtes diffusées
              </h3>
            </div>
            {campaigns.length === 0 ? (
              <p className="px-6 py-12 text-center text-slate-400 text-sm italic">Aucune enquête pour le moment.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <li key={c.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm">{c.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase">
                        {SURVEY_TARGET_LABELS[c.targetType]}
                        {c.class && ` · ${c.class.name}`}
                        {" · "}{c._count.responses} réponse(s)
                        {" · "}{new Date(c.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCampaign(c.id, !c.isActive)}
                        disabled={isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition ${c.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                      >
                        <Power className="h-3 w-3" />
                        {c.isActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(c.id)}
                        disabled={isPending}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl border border-slate-200 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "complaints" && (
        <div className="space-y-4">
          {selectedComplaintForAction && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-violet-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Mesure Corrective — Indicateur 32
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedComplaintForAction(null);
                      setActionSuccess(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    Fermer
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    Réclamation : {selectedComplaintForAction.subject}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Déposée par {selectedComplaintForAction.sender.firstName} {selectedComplaintForAction.sender.lastName}
                  </span>
                </div>

                {actionSuccess ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveAction} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Analyse de cause & Solution corrective mise en œuvre *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Ex : Réunion avec l'intervenant pour réajuster le planning. Prise de contact avec l'entreprise. Décision de doubler le créneau de tutorat..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs focus:outline-none focus:border-violet-500 focus:bg-white resize-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Cette mesure sera consignée dans le registre officiel RNQ et un avis de résolution sera notifié au déclarant.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedComplaintForAction(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/20 disabled:opacity-50"
                      >
                        {isPending ? "Enregistrement..." : "Enregistrer & Résoudre"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {complaints.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm font-bold uppercase italic">Aucune réclamation.</p>
          ) : complaints.map((c) => (
            <div key={c.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareWarning className="h-4 w-4 text-amber-500 shrink-0" />
                    <h3 className="font-black text-slate-900 text-sm">{c.subject}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{c.description}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-3 uppercase">
                    {c.sender.lastName} {c.sender.firstName} · {new Date(c.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedComplaintForAction(c);
                      setActionNote("");
                      setActionSuccess(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition shadow-sm"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
                    <span>Mesure corrective (Ind. 32)</span>
                  </button>

                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                    disabled={isPending}
                    className="text-[10px] font-black uppercase px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-violet-500"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteComplaint(c.id)}
                    disabled={isPending}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "surveys" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-5 py-4">Répondant</th>
                <th className="px-5 py-4">Profil</th>
                <th className="px-5 py-4">Enquête</th>
                <th className="px-5 py-4">Note</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {surveys.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Aucune réponse.</td></tr>
              ) : surveys.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-bold text-slate-800">
                    {s.user.lastName} {s.user.firstName}
                    {s.user.class && <span className="block text-[10px] text-slate-400 font-medium">{s.user.class.name}</span>}
                  </td>
                  <td className="px-5 py-4 text-slate-500">{ROLE_LABELS[s.user.role] ?? s.user.role}</td>
                  <td className="px-5 py-4 text-slate-600 max-w-[180px] truncate">{s.campaign?.title ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 font-black text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {s.rating}/5
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteSurvey(s.id)}
                      disabled={isPending}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
