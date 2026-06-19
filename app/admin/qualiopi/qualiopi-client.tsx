"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star, MessageSquareWarning, Trash2 } from "lucide-react";
import { updateComplaintStatus, deleteComplaint, deleteSatisfactionSurvey } from "@/app/actions/qualiopi";

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
  student: { firstName: string | null; lastName: string | null; class: { name: string } | null };
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolue",
  CLOSED: "Fermée",
};

type Props = {
  complaints: Complaint[];
  surveys: Survey[];
};

export default function QualiopiClient({ complaints: initialComplaints, surveys: initialSurveys }: Props) {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [surveys, setSurveys] = useState(initialSurveys);
  const [tab, setTab] = useState<"complaints" | "surveys">("complaints");
  const [isPending, startTransition] = useTransition();

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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Réclamations traitées</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">
            {complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length}
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        {(["complaints", "surveys"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 -mb-[2px] transition ${tab === t ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            {t === "complaints" ? "Réclamations" : "Satisfaction"}
          </button>
        ))}
      </div>

      {tab === "complaints" && (
        <div className="space-y-4">
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
                <div className="flex items-center gap-2 shrink-0">
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
                <th className="px-5 py-4">Élève</th>
                <th className="px-5 py-4">Classe</th>
                <th className="px-5 py-4">Note</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {surveys.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Aucune réponse.</td></tr>
              ) : surveys.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-bold text-slate-800">{s.student.lastName} {s.student.firstName}</td>
                  <td className="px-5 py-4 text-slate-500">{s.student.class?.name ?? "—"}</td>
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
