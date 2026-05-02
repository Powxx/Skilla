"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { CreateStudentState } from "./actions";
import { createStudent } from "./actions";

type ClassOption = { id: string; name: string };

type Props = {
  classes: ClassOption[];
};

const initialState: CreateStudentState = {};

export default function AddStudentModal({ classes }: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    createStudent,
    initialState,
  );

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => firstFieldRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Ajouter un élève
      </button>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100%-2rem)] w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ring-1 ring-slate-900/5 backdrop:bg-slate-900/40"
        aria-labelledby="modal-title"
        onClose={() => setOpen(false)}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="modal-title"
                className="text-base font-semibold tracking-tight text-slate-900"
              >
                Nouvel élève
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Créez un compte élève et affectez-le à une classe.
              </p>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-5 py-4">
          {state?.error ? (
            <div
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {state.error}
            </div>
          ) : null}

          <form action={formAction} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Prénom
                </span>
                <input
                  ref={firstFieldRef}
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900/10 transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                  placeholder="Prénom"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Nom
                </span>
                <input
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900/10 transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                  placeholder="Nom"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                E-mail (identifiant)
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900/10 transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                placeholder="prenom.nom@ecole.fr"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Mot de passe
              </span>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900/10 transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                placeholder="Au moins 8 caractères"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Classe
              </span>
              <select
                name="classId"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-900/10 transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                defaultValue=""
              >
                <option value="" disabled>
                  Choisir une classe…
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending || classes.length === 0}
                className="inline-flex rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Enregistrement…" : "Créer l’élève"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
