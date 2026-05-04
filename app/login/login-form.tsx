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
  const [success, setSuccess] = useState(false);

  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      window.location.href = pathAfterLogin(session.user.role);
    }
  }, [status, session]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      // 1. Connexion via NextAuth
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        setError("E-mail ou mot de passe incorrect.");
        setPending(false);
        return;
      }

      setSuccess(true);
      
      // 2. On attend une fraction de seconde pour que le cookie soit bien propagé
      // puis on redirige en dur pour forcer le middleware à tout re-vérifier proprement
      setTimeout(async () => {
        try {
          const res = await fetch("/api/auth/session");
          const sessionData = await res.json();
          const role = sessionData?.user?.role;
          
          if (role) {
            window.location.href = pathAfterLogin(role);
          } else {
            window.location.href = "/";
          }
        } catch {
          window.location.href = "/";
        }
      }, 500);

    } catch (err) {
      console.error(err);
      setError("Une erreur réseau s’est produite.");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_22px_60px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm sm:p-10 transition-all duration-500">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 text-lg font-bold tracking-tight text-white shadow-lg transition-transform duration-700 ${success ? 'rotate-[360deg] scale-110' : ''}`}>
          {success ? "✓" : "S"}
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Skilla</p>
        <p className="mt-2 text-sm text-slate-500">
          {success ? "Identification réussie..." : "Connectez-vous à votre espace scolaire"}
        </p>
      </div>

      {!success ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 animate-shake">
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
            className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Authentification...
              </>
            ) : "Se connecter"}
          </button>
        </form>
      ) : (
        <div className="py-10 flex flex-col items-center">
           <div className="h-2 w-full max-w-[200px] bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-sky-600 animate-progress origin-left"></div>
           </div>
           <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Chargement de votre session</p>
        </div>
      )}
    </div>
  );
}