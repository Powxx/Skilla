'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // On pourrait logger l'erreur vers un service comme Sentry ici
    console.error('ERREUR GLOBALE APP:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 text-4xl">⚠️</div>
      <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Une erreur est survenue</h1>
      <p className="text-slate-500 mb-8 max-w-md">
        Le serveur rencontre une difficulté passagère. Cela peut être dû à une surcharge ou une micro-coupure réseau.
      </p>
      
      {error.digest && (
        <p className="text-[10px] font-mono text-slate-300 mb-8">ID: {error.digest}</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          Réessayer
        </button>
        <button
          onClick={() => {
            // Un hard redirect vers /login vide le cache d'état React du client
            window.location.href = '/login';
          }}
          className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
        >
          Retour Connexion
        </button>
      </div>
    </div>
  );
}
