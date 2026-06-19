"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ShieldAlert, Clock, User, MessageSquare, Send, Trash2 } from "lucide-react";
import { SanctionStatus } from "@prisma/client";
import { addSanctionComment, deleteSanctionComment } from "@/app/actions/sanctions";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/sanctions-ui";

type SanctionComment = {
  id: string;
  body: string;
  createdAt: Date | string;
  authorId: string;
  author: { firstName: string | null; lastName: string | null; role: string };
};

export type SanctionPortalItem = {
  id: string;
  reason: string;
  date: Date | string;
  duration: string | null;
  status: SanctionStatus;
  pointsCost: number;
  sanctionType: { name: string };
  givenBy: { firstName: string; lastName: string; role: string };
  comments?: SanctionComment[];
};

type Props = {
  sanctions: SanctionPortalItem[];
  commentsEnabled: boolean;
  currentUserId: string;
  currentUserRole: string;
  pointsEnabled: boolean;
  emptyTitle: string;
  emptyDescription: string;
};

function roleLabel(role: string) {
  if (role === "STUDENT") return "Élève";
  if (role === "RESPONSIBLE") return "Parent";
  if (role === "COMPANY_TUTOR") return "Tuteur entreprise";
  if (role === "TEACHER") return "Professeur";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "Administration";
  return role;
}

function SanctionComments({
  sanctionId,
  initialComments,
  currentUserId,
  currentUserRole,
}: {
  sanctionId: string;
  initialComments: SanctionComment[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [baseComments, setBaseComments] = useState(initialComments);
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    baseComments,
    (state, newComment: SanctionComment) => [...state, newComment]
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError(null);

    const tempComment: SanctionComment = {
      id: `optimistic-${Date.now()}`,
      body,
      createdAt: new Date().toISOString(),
      authorId: currentUserId,
      author: { firstName: "Vous", lastName: "", role: currentUserRole },
    };

    startTransition(async () => {
      addOptimisticComment(tempComment);
      setDraft("");
      try {
        const res = await addSanctionComment(sanctionId, body);
        if (res.ok && res.comment) {
          setBaseComments((prev) => [
            ...prev,
            {
              id: res.comment.id,
              body: res.comment.body,
              createdAt: res.comment.createdAt,
              authorId: currentUserId,
              author: {
                firstName: res.comment.author.firstName,
                lastName: res.comment.author.lastName,
                role: res.comment.author.role,
              },
            },
          ]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
        setDraft(body);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    if (commentId.startsWith("optimistic-")) return;
    if (!confirm("Supprimer ce commentaire ?")) return;
    startTransition(async () => {
      setBaseComments((prev) => prev.filter((c) => c.id !== commentId));
      try {
        await deleteSanctionComment(commentId);
      } catch {
        setBaseComments(initialComments);
      }
    });
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Commentaires ({optimisticComments.length})
      </p>

      {optimisticComments.length > 0 && (
        <ul className="space-y-2">
          {optimisticComments.map((c) => {
            const isOwn = c.authorId === currentUserId;
            const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(currentUserRole);
            const canDelete = isOwn || isAdmin;
            const isOptimistic = c.id.startsWith("optimistic-");

            return (
              <li
                key={c.id}
                className={`rounded-xl border px-3 py-2 text-xs ${isOptimistic ? "opacity-60 border-dashed border-slate-200 bg-slate-50" : "border-slate-100 bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                      {c.author.firstName} {c.author.lastName}
                      <span className="text-slate-400 font-bold ml-1.5">· {roleLabel(c.author.role)}</span>
                    </p>
                    <p className="text-slate-700 font-medium mt-0.5 whitespace-pre-line">{c.body}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">
                      {new Date(c.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  {canDelete && !isOptimistic && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={isPending}
                      className="p-1 text-slate-400 hover:text-red-600 transition shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-[10px] font-bold text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter un commentaire..."
          disabled={isPending}
          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 transition"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="px-3 py-2 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition disabled:opacity-50 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}

export default function SanctionsPortalList({
  sanctions,
  commentsEnabled,
  currentUserId,
  currentUserRole,
  pointsEnabled,
  emptyTitle,
  emptyDescription,
}: Props) {
  if (sanctions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          ✓
        </div>
        <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide">{emptyTitle}</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sanctions.map((s) => {
        const formattedDate = new Date(s.date).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        return (
          <div
            key={s.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition"
          >
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-3 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-100 shadow-sm">
                    <ShieldAlert className="h-3 w-3" />
                    {s.sanctionType.name}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[s.status]}`}
                  >
                    {STATUS_LABELS[s.status]}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    <Clock className="h-3.5 w-3.5" />
                    Le {formattedDate}
                  </span>
                  {s.duration && (
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-tight">
                      Durée : {s.duration}
                    </span>
                  )}
                  {pointsEnabled && s.pointsCost > 0 && (
                    <span className="text-[10px] text-red-600 font-black bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                      -{s.pointsCost} pts
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-700 font-semibold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-150 whitespace-pre-line">
                  {s.reason}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 w-full md:w-auto">
                <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Décidé par
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    M. / Mme. {s.givenBy.lastName}
                  </p>
                </div>
              </div>
            </div>

            {commentsEnabled && (
              <SanctionComments
                sanctionId={s.id}
                initialComments={s.comments ?? []}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
