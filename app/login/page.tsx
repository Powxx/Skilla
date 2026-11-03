import type { Metadata } from "next";
import LoginForm from "./login-form";
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Connexion — Skilla",
  description: "Accédez à votre espace élève, enseignant ou administration.",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-slate-100 font-sans text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(14,165,233,0.18),transparent),radial-gradient(ellipse_80%_60%_at_100%_60%,rgba(13,148,136,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
        <LoginForm />
        <p className="mt-6 sm:mt-10 max-w-md text-center text-xs text-slate-500">
          Plateforme de connexion à Skilla.{" "}
          <a href="/confidentialite" className="font-semibold text-sky-700 underline">
            Politique de confidentialité
          </a>
        </p>
      </div>
    </div>
  );
}
