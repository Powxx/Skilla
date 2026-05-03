"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

// Cette fonction définit tes routes réelles
function pathAfterLogin(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
      return "/prof"; // Vérifie que ton dossier s'appelle bien 'prof' et pas 'teacher'
    case "STUDENT":
      return "/student";
    case "PARENT":
    case "EMPLOYER":
      return "/parent";
    default:
      return "/";
  }
}

export default function LoginForm() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      router.replace(pathAfterLogin(session.user.role));
    }
  }, [status, session, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      // ÉTAPE 1 : Connexion sans redirection automatique
      const result = await signIn("credentials", {
        redirect: false, // INDISPENSABLE pour gérer le rôle nous-mêmes
        email: email.trim(),
        password,
      });

      if (result?.error) {
        setError("E-mail ou mot de passe incorrect.");
        setPending(false);
        return;
      }

      // ÉTAPE 2 : Récupérer la session fraîche pour avoir le rôle
      const res = await fetch("/api/auth/session");
      const updatedSession = await res.json();
      
      const role = updatedSession?.user?.role;

      if (role) {
        const targetPath = pathAfterLogin(role);
        console.log("Redirection vers :", targetPath);
        router.push(targetPath);
        router.refresh();
      } else {
        // Si pas de rôle, on va à l'accueil par défaut
        router.push("/");
      }

    } catch (err) {
      console.error(err);
      setError("Une erreur réseau s’est produite.");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_22px_60px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm sm:p-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 text-lg font-bold tracking-tight text-white shadow-lg shadow-teal-600/25">
          S
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Skilla</p>
        <p className="mt-2 text-sm text-slate-500">Connectez-vous à votre espace scolaire</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
            placeholder="vous@ecole.fr"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mot de passe</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}