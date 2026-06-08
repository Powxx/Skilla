"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getAllPersonalBests } from '@/app/actions/game-center';

const GAMES = [
  { id: 'vocabulary-sensei', name: 'Vocabulary Sensei', subject: 'Anglais', icon: '🏮', description: 'Traduisez les termes beauté avant le gong.' },
  { id: 'calligraphy-flow', name: 'Edo Design', subject: 'Art Appliqué', icon: '🎨', description: 'Reconstituez des motifs traditionnels.', primary: true },
  { id: 'sakura-mix', name: 'Sakura Mix', subject: 'Cosmétologie', icon: '🌸', description: 'Alignez les pigments pour créer la nuance parfaite.', primary: true },
  { id: 'ninja-intuition', name: 'Ninja Intuition', subject: 'Diagnostic', icon: '👁️', description: 'Identifiez les anomalies en un temps record.' },
  { id: 'dojo-rhythm', name: 'Dojo Rhythm', subject: 'EPS', icon: '🧘', description: 'Tapez en rythme pour vos postures.' },
  { id: 'haiku-scrabble', name: 'Haiku Scrabble', subject: 'Français', icon: '📜', description: 'Formez des mots pour compléter les haïkus.' },
  { id: 'koban-salon', name: 'Koban Salon', subject: 'Gestion', icon: '💰', description: 'Gérez les finances de votre salon Edo.' },
  { id: 'silk-road', name: 'Silk Road Explorer', subject: 'Histoire-Géo', icon: '🗺️', description: 'Explorez l\'origine des rituels de beauté.' },
  { id: 'zen-connect', name: 'Zen Connect', subject: 'Informatique', icon: '🔌', description: 'Reliez les flux de données du salon.' },
  { id: 'abacus-dosages', name: 'Abacus Dosages', subject: 'Mathématiques', icon: '🧮', description: 'Calculez les mélanges sur un boulier.' },
  { id: 'katana-scissors', name: 'Katana Scissors', subject: 'Pratique', icon: '⚔️', description: 'Coupez les mèches avec la précision du sabre.' , primary: true},
  { id: 'safety-shuriken', name: 'Safety Shuriken', subject: 'PSE', icon: '🎯', description: 'Éliminez les risques professionnels.' },
  { id: 'skin-defense', name: 'Skin Defense', subject: 'Biologie appliquée', icon: '🛡️', description: 'Protégez la barrière cutanée.', primary: true },
  { id: 'ph-alchemy', name: 'pH Alchemy', subject: 'Sciences', icon: '🧪', description: 'Stabilisez le pH de vos solutions.' },
  { id: 'maintenance-monk', name: 'Maintenance Monk', subject: 'Technologie', icon: '🔧', description: 'Réparez vos appareils de beauté.' },
];

export default function GameCenter() {
  const { data: session } = useSession();
  const [streak, setStreak] = useState(0);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (session?.user?.id) {
      setStreak((session.user as any).loginStreak || 0);
      getAllPersonalBests(session.user.id).then(setBestScores);
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10 font-sans">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-600/20">
              Skilla Arcade
            </span>
            <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold text-orange-700 uppercase">{streak} JOURS DE SÉRIE</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Le Chemin du Maître</h1>
          <p className="text-slate-500 mt-2 font-medium">Entraînez vos compétences à travers les arts ancestraux.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <Link 
              key={game.id} 
              href={`/student/games/${game.id}`}
              className={`group relative overflow-hidden rounded-3xl border bg-white p-6 transition-all hover:shadow-xl hover:-translate-y-1 ${
                game.primary ? 'border-red-200 ring-2 ring-red-500/10' : 'border-slate-200 shadow-sm'
              }`}
            >
              {game.primary && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                  Nouveau
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-3xl transition-transform group-hover:scale-110 group-hover:rotate-6">
                  {game.icon}
                </div>
                <div>
                  <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
                    {game.subject}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                    {game.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-snug">
                    {game.description}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meilleur score</span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">
                    {bestScores[game.id] ? bestScores[game.id].toLocaleString() : '---'}
                  </span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
