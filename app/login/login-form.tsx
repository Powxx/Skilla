"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

function pathAfterLogin(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
      return "/prof";
    case "STUDENT":
      return "/student";
    case "PARENT":
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

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.role) return;
    router.replace(pathAfterLogin(session.user.role));
  }, [status, session, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (result?.error) {
        setError("E-mail ou mot de passe incorrect.");
        return;
      }

      if (!result?.ok) {
        setError("Connexion impossible. Réessayez.");
        return;
      }

      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const session = (await res.json()) as { user?: { role?: string } };
      const role = session?.user?.role ?? "STUDENT";
      router.push(pathAfterLogin(role));
      router.refresh();
    } catch {
      setError("Une erreur réseau s’est produite.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_22px_60px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm sm:p-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 text-lg font-bold tracking-tight text-white shadow-lg shadow-teal-600/25"
          aria-hidden
        >
          SP
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">
          Skilla
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Connectez-vous à votre espace scolaire
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} autoComplete="on">
        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            E-mail
          </span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-slate-400/25 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
            placeholder="vous@ecole.fr"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mot de passe
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-slate-400/25 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="relative w-full overflow-hidden rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
