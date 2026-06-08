"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X, Trophy, Zap, MapPin, Eye } from "lucide-react";

// Configuration
const GAME_KEY = 'silk-road-memory';
const CITIES = [
  { name: 'Tokyo', x: 78, y: 40, icon: '🗼' },
  { name: 'Kyoto', x: 62, y: 58, icon: '⛩️' },
  { name: 'Osaka', x: 50, y: 75, icon: '🏯' },
  { name: 'Sapporo', x: 88, y: 12, icon: '❄️' },
  { name: 'Fukuoka', x: 15, y: 82, icon: '🍜' },
  { name: 'Hiroshima', x: 32, y: 72, icon: '🕊️' },
  { name: 'Nara', x: 60, y: 75, icon: '🦌' },
  { name: 'Nagoya', x: 72, y: 62, icon: '🏙️' },
  { name: 'Sendai', x: 82, y: 28, icon: '🌲' },
];

export default function SilkRoadMemory() {
  const { data: session } = useSession();
  
  // Game State
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'IDLE' | 'SHOWING' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [highlightedCity, setHighlightCity] = useState<number | null>(null);
  
  // UI State
  const [studentStats, setStudentStats] = useState<{ average: number, streak: number, classId: string | null }>({ average: 0, streak: 0, classId: null });
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');

  const powerUps = useMemo(() => ({
    hintAvailable: studentStats.average >= 12,
    scoreDouble: studentStats.average >= 16,
    streakMultiplier: Math.min(2.0, 1 + (studentStats.streak * 0.1))
  }), [studentStats]);

  const [hintsUsed, setHintUsed] = useState(0);

  // Init Data
  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(setStudentStats);
        getPersonalBest(session.user.id, GAME_KEY).then(setPersonalBest);
    }
  }, [session]);

  const nextLevel = useCallback((currentLevel: number) => {
    const newSequence = [];
    for (let i = 0; i < currentLevel + 2; i++) {
      newSequence.push(Math.floor(Math.random() * CITIES.length));
    }
    setSequence(newSequence);
    setUserSequence([]);
    setGameState('SHOWING');
  }, []);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setHintUsed(0);
    setGameState('SHOWING');
    nextLevel(1);
  };

  // Sequence Player
  useEffect(() => {
    if (gameState === 'SHOWING' && sequence.length > 0) {
      let i = 0;
      const interval = setInterval(() => {
        setHighlightCity(sequence[i]);
        setTimeout(() => setHighlightCity(null), 600);
        i++;
        if (i >= sequence.length) {
          clearInterval(interval);
          setTimeout(() => setGameState('PLAYING'), 800);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, sequence]);

  const handleCityClick = (index: number) => {
    if (gameState !== 'PLAYING') return;

    const newUserSequence = [...userSequence, index];
    setUserSequence(newUserSequence);

    // Visual feedback
    setHighlightCity(index);
    setTimeout(() => setHighlightCity(null), 300);

    // Check correctness
    if (index !== sequence[userSequence.length]) {
      endGame();
      return;
    }

    // Level Complete
    if (newUserSequence.length === sequence.length) {
      const levelPoints = level * 100;
      setScore(s => s + Math.round(levelPoints * powerUps.streakMultiplier * (powerUps.scoreDouble ? 2 : 1)));
      setLevel(l => l + 1);
      setTimeout(() => nextLevel(level + 1), 1000);
    }
  };

  const useHint = () => {
    if (!powerUps.hintAvailable || hintsUsed >= 1 || gameState !== 'PLAYING') return;
    setGameState('SHOWING');
    setHintUsed(1);
    setUserSequence([]);
  };

  const endGame = useCallback(() => {
    setGameState('GAMEOVER');
    if (session?.user?.id) {
        saveGameScore(session.user.id, GAME_KEY, score);
    }
  }, [session, score]);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    const scopeClassId = lbScope === 'class' ? (studentStats.classId ?? undefined) : undefined;
    const data = await getLeaderboard(GAME_KEY, scopeClassId);
    setLeaderboard(data);
    setLoadingLeaderboard(false);
  }, [lbScope, studentStats.classId]);

  useEffect(() => { if (showLeaderboard) fetchLeaderboard(); }, [showLeaderboard, fetchLeaderboard]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 p-4 font-sans overflow-hidden select-none">
      
      {/* Header / Stats */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-orange-200 text-orange-400 shadow-sm"><X /></Link>
        <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-2xl border border-orange-200 text-orange-900 font-black shadow-sm min-w-[100px] text-center">Niveau: {level}</div>
            <div className="bg-white px-4 py-2 rounded-2xl border border-orange-200 text-orange-900 font-black shadow-sm min-w-[120px] text-center">Score: {score}</div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-orange-200 text-blue-500 shadow-sm hover:bg-orange-50"><Zap size={20}/></button>
            <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-orange-200 text-amber-500 shadow-sm hover:bg-orange-50"><Trophy size={20}/></button>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative w-full max-w-2xl aspect-[4/3] bg-white rounded-[3rem] border-8 border-orange-100 shadow-2xl overflow-hidden">
        
        {/* Parchment Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/old-map.png')]"></div>
        
        {/* Japan Map Silhouette (Simplified via SVG path or stylized div) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <MapPin size={300} className="text-orange-900" />
        </div>

        {/* Cities */}
        {CITIES.map((city, i) => (
            <button
                key={i}
                onClick={() => handleCityClick(i)}
                className={`absolute transition-all duration-300 group ${gameState === 'PLAYING' ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                style={{ left: `${city.x}%`, top: `${city.y}%` }}
                disabled={gameState !== 'PLAYING'}
            >
                <div className={`relative flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-500 shadow-lg border-2 ${
                        highlightedCity === i 
                        ? 'bg-orange-500 border-white scale-125 z-30 ring-4 ring-orange-200' 
                        : 'bg-white border-orange-100 z-10'
                    }`}>
                        {city.icon}
                    </div>
                    <span className={`mt-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        highlightedCity === i ? 'bg-orange-900 text-white' : 'bg-orange-100 text-orange-900 opacity-60'
                    }`}>
                        {city.name}
                    </span>
                </div>
            </button>
        ))}

        {/* Hints Button */}
        {gameState === 'PLAYING' && powerUps.hintAvailable && hintsUsed === 0 && (
            <button 
                onClick={useHint}
                className="absolute bottom-8 right-8 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-400 active:scale-95 transition-all"
            >
                <Eye size={16} />
                Observer (Aide)
            </button>
        )}

        {/* Overlay Screens */}
        {(gameState === 'IDLE' || gameState === 'GAMEOVER') && (
            <div className="absolute inset-0 flex items-center justify-center bg-orange-50/95 z-40 backdrop-blur-sm">
                <div className="text-center p-8 max-w-sm">
                    <div className="w-24 h-24 bg-orange-900 rounded-[2rem] flex items-center justify-center text-white text-5xl mx-auto mb-6 shadow-2xl rotate-3">🗺️</div>
                    <h2 className="text-4xl font-black mb-2 text-orange-900 uppercase tracking-tighter italic">Silk Road Memory</h2>
                    <p className="text-orange-600/60 font-bold uppercase tracking-widest text-xs mb-8">Maîtrisez la géographie du Japon impérial</p>
                    
                    {gameState === 'GAMEOVER' && (
                        <div className="mb-8 p-6 bg-white rounded-3xl border border-orange-200 shadow-sm">
                            <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Cités Découvertes</div>
                            <div className="text-4xl font-black text-orange-900">{score}</div>
                        </div>
                    )}

                    <button 
                        onClick={startGame} 
                        className="w-full py-5 bg-orange-900 hover:bg-orange-800 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                    >
                        {gameState === 'GAMEOVER' ? "Repartir en Expédition" : "Commencer le Voyage"}
                    </button>
                </div>
            </div>
        )}

        {/* Phase Indicator */}
        {gameState === 'SHOWING' && (
             <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-2 bg-orange-900 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl animate-bounce">
                <Eye size={16} />
                Mémorisez le chemin...
             </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-orange-300">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Subject : Histoire-Géo</p>
        <p className="text-[8px] font-bold uppercase tracking-[0.5em]">Skilla Academic Memory Training</p>
      </div>
      
      {/* Advantages Modal */}
      {showAdvantages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdvantages(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-orange-900 uppercase tracking-tighter">Sagesse du Voyageur</h3>
                <button onClick={() => setShowAdvantages(false)} className="text-orange-300 hover:text-orange-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-5 bg-orange-50 rounded-[1.5rem] border border-orange-100">
                    <div>
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Série Actuelle</p>
                        <p className="text-lg font-black text-orange-900">Multiplicateur x{powerUps.streakMultiplier.toFixed(1)}</p>
                    </div>
                    <span className="text-3xl">🔥</span>
                 </div>
                 <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all ${powerUps.scoreDouble ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                    <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Moyenne &gt; 16</p>
                        <p className="text-sm font-bold text-emerald-900">Score Double (x2)</p>
                    </div>
                    <span className="text-2xl">💎</span>
                 </div>
                 <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all ${powerUps.hintAvailable ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Moyenne &gt; 12</p>
                        <p className="text-sm font-bold text-blue-900">Joker "Observer" disponible</p>
                    </div>
                    <span className="text-2xl">👁️</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b border-orange-50 bg-orange-50/50 flex justify-between items-center">
                 <h3 className="text-xl font-black text-orange-900 uppercase tracking-tighter">Grands Explorateurs</h3>
                 <button onClick={() => setShowLeaderboard(false)} className="text-orange-300 hover:text-orange-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="p-6">
                 <div className="flex bg-orange-100/50 p-1 rounded-2xl mb-6">
                    <button onClick={() => setLbScope('class')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${lbScope === 'class' ? 'bg-white text-orange-900 shadow-sm' : 'text-orange-400 hover:text-orange-600'}`}>Mon Dojo</button>
                    <button onClick={() => setLbScope('school')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${lbScope === 'school' ? 'bg-white text-orange-900 shadow-sm' : 'text-orange-400 hover:text-orange-600'}`}>L'Empire</button>
                 </div>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {loadingLeaderboard ? (
                        <div className="py-10 text-center text-orange-400 font-bold animate-pulse uppercase tracking-widest text-xs">Recherche des maîtres...</div>
                    ) : leaderboard.length > 0 ? (
                        leaderboard.map((s, i) => (
                            <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${s.userName === session?.user?.name ? 'bg-orange-900 text-white border-orange-900' : 'bg-orange-50 border-orange-100'}`}>
                                <div className="flex items-center gap-4">
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-orange-400 text-black' : s.userName === session?.user?.name ? 'bg-white/20 text-white' : 'bg-orange-200 text-orange-500'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="font-bold text-sm">{s.userName}</span>
                                </div>
                                <span className={`font-black ${s.userName === session?.user?.name ? 'text-amber-400' : 'text-orange-900'}`}>{s.score}</span>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-orange-400 font-bold uppercase tracking-widest text-xs">Aucun voyageur encore...</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
