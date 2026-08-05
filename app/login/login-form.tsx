"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

// Cette fonction définit tes routes réelles
function pathAfterLogin(role: string): string {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    case "TEACHER":
      return "/prof";
    case "STUDENT":
      return "/student/dashboard";
    case "COMPANY_TUTOR":
      return "/employer/dashboard";
    case "RESPONSIBLE":
      return "/parent/dashboard";
    default:
      return "/";
  }
}

export default function LoginForm() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Détection du paramètre reason=timeout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "timeout") {
      setError("Votre session a expiré après une période d'inactivité.");
    }
  }, []);

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
        username: username.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        setError("Identifiant ou mot de passe incorrect.");
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
          <img src="/SKILLA-Logo.png" alt="SKILLA" />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Skilla</p>
        <p className="mt-2 text-sm text-slate-500">
          {success ? "Identification réussie..." : "Connectez-vous à votre espace scolaire"}
        </p>
      </div>

      {showForgot ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Mot de passe oublié</h3>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed font-medium">
              Pour réinitialiser votre mot de passe, veuillez contacter l'administration de votre établissement ou votre enseignant.
            </p>
            <p className="mt-2 text-[10px] text-slate-400 font-medium leading-relaxed">
              Un administrateur pourra réinitialiser et vous communiquer vos nouveaux identifiants de connexion depuis son panneau de contrôle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForgot(false)}
            className="w-full flex justify-center items-center rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
          >
            Retour à la connexion
          </button>
        </div>
      ) : !success ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 animate-shake">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Identifiant</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
              placeholder="p-nom"
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

          <div className="flex justify-end text-[11px] -mt-2">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sky-600 hover:text-sky-700 hover:underline font-bold focus:outline-none transition-colors duration-200"
            >
              Mot de passe oublié ?
            </button>
          </div>

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