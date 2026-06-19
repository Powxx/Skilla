"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitSurveyResponse } from "@/app/actions/qualiopi";
import { SURVEY_TARGET_LABELS } from "@/lib/qualiopi";
import type { SatisfactionSurveyTarget } from "@prisma/client";

type Props = {
  campaignId: string;
  title: string;
  description: string | null;
  targetType: SatisfactionSurveyTarget;
  className: string | null;
  alreadySubmitted: boolean;
  dashboardHref: string;
};

export default function SurveyFormClient({
  campaignId,
  title,
  description,
  targetType,
  className,
  alreadySubmitted,
  dashboardHref,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Veuillez sélectionner une note.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await submitSurveyResponse(campaignId, rating, comment);
        setSubmitted(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
      }
    });
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-10 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl">
          ✓
        </div>
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">Merci pour votre réponse</h2>
        <p className="text-sm text-slate-500 mt-2 font-medium">Votre avis contribue à l&apos;amélioration de l&apos;établissement.</p>
        <a
          href={dashboardHref}
          className="inline-block mt-6 px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-2">
        Enquête · {SURVEY_TARGET_LABELS[targetType]}
        {className && ` · ${className}`}
      </p>
      <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">{title}</h1>
      {description && (
        <p className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-line">{description}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Votre satisfaction (1 à 5)
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-2 transition hover:scale-110"
              >
                <Star
                  className={`h-9 w-9 ${n <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={isPending}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition resize-none"
            placeholder="Partagez votre expérience..."
          />
        </div>

        {error && <p className="text-xs font-bold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending || rating < 1}
          className="w-full py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition disabled:opacity-50"
        >
          {isPending ? "Envoi..." : "Envoyer ma réponse"}
        </button>
      </form>
    </div>
  );
}
