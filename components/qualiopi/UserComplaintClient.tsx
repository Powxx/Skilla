"use client";

import { useState, useTransition } from "react";
import { 
  MessageSquareWarning, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertCircle
} from "lucide-react";
import { submitComplaint } from "@/app/actions/qualiopi";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_LABELS } from "@/lib/qualiopi";

type UserComplaint = {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: Date | string;
};

type Props = {
  initialComplaints: UserComplaint[];
  userName?: string;
};

export default function UserComplaintClient({ initialComplaints, userName }: Props) {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [tab, setTab] = useState<"form" | "history">("form");
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState<string>("PEDAGOGIE");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const catObj = COMPLAINT_CATEGORIES.find((c) => c.id === category);
    const categoryLabel = catObj ? catObj.label : category;

    startTransition(async () => {
      try {
        const res = await submitComplaint({
          category: categoryLabel,
          subject,
          description,
        });

        if (res.ok) {
          setSuccess("Votre réclamation a bien été enregistrée et transmise à la cellule Qualité. Un accusé de réception vous est adressé.");
          setComplaints([
            {
              id: res.complaintId,
              subject: `[${categoryLabel}] ${subject}`,
              description,
              status: "OPEN",
              createdAt: new Date().toISOString(),
            },
            ...complaints,
          ]);
          setSubject("");
          setDescription("");
          setTab("history");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur lors du dépôt de la réclamation.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* BANNIÈRE EXPLICATIVE DÉMARCHE QUALITÉ QUALIOPI */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 h-48 w-48 rounded-full bg-violet-600/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/20 text-violet-300 text-[11px] font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Démarche Qualité & Référentiel National Qualiopi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Espace Réclamations & Suggestions
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-2xl">
              Conformément à l'Indicateur 31 du Référentiel National Qualité (RNQ), notre établissement assure le recueil, la traçabilité et le traitement transparent de chaque réclamation sous 15 jours ouvrés.
            </p>
          </div>
        </div>
      </div>

      {/* ONGLETS FORMULAIRE / HISTORIQUE */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("form")}
          className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 -mb-[2px] transition ${
            tab === "form"
              ? "border-violet-600 text-violet-600 bg-violet-50/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <MessageSquareWarning className="h-4 w-4" />
          <span>Déposer une réclamation</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 -mb-[2px] transition ${
            tab === "history"
              ? "border-violet-600 text-violet-600 bg-violet-50/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Mes signalements ({complaints.length})</span>
        </button>
      </div>

      {/* CONTENU ONGLETS */}
      {tab === "form" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SÉLECTEUR DE CATÉGORIES */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                1. Domaine concerné *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COMPLAINT_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "border-violet-600 bg-violet-50/80 text-violet-900 ring-2 ring-violet-500/20 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50"
                      }`}
                    >
                      <span className="text-xs font-black">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OBJET */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                2. Objet du signalement *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex : Problème d'accès à la salle informatique B12 / Retard planning"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:bg-white transition"
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                3. Description détaillée des faits et suggestions d'amélioration *
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez précisément les faits, dates, intervenants ou contextes rencontrés afin de nous permettre d'instruire et d'apporter une solution corrective..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-normal focus:outline-none focus:border-violet-500 focus:bg-white transition resize-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Votre réclamation est traitée de manière confidentielle par l'équipe de direction et la cellule Qualité.
              </p>
            </div>

            {/* BOUTON D'ENVOI */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] text-slate-500">
                🔒 Enregistrement horodaté au registre officiel Qualiopi
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition active:scale-95 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{isPending ? "Transmission en cours..." : "Transmettre ma réclamation"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 opacity-60" />
              <p className="text-sm font-bold text-slate-700">Aucune réclamation enregistrée</p>
              <p className="text-xs text-slate-400">Toutes vos démarches ont été traitées ou aucun signalement n'a été déposé.</p>
            </div>
          ) : (
            complaints.map((c) => {
              const statusCfg = COMPLAINT_STATUS_LABELS[c.status] || COMPLAINT_STATUS_LABELS.OPEN;
              return (
                <div key={c.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Réf. #{c.id.slice(-6)} · {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <h3 className="font-bold text-base text-slate-900">{c.subject}</h3>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider shrink-0 ${statusCfg.badgeBg} ${statusCfg.color}`}>
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {statusCfg.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100 font-sans">
                    {c.description}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
