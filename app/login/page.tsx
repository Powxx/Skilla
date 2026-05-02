import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Connexion — Skilla",
  description: "Accédez à votre espace élève, enseignant ou administration.",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(14,165,233,0.18),transparent),radial-gradient(ellipse_80%_60%_at_100%_60%,rgba(13,148,136,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <LoginForm />
        <p className="mt-10 max-w-md text-center text-xs text-slate-500">
          Plateforme de connexion à Skilla.
        </p>
      </div>
    </div>
  );
}
