"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X, Trophy, Zap, Scissors } from "lucide-react";

// Configuration
const GAME_KEY = 'bonsai-trimmer';
const INITIAL_TIME = 45;
const BRANCH_SPAWN_RATE = 1500; // ms

// Shared game info (avoiding build error)
const GAME_INFO = { id: 'bonsai-trimmer', name: 'Bonsai Trimmer', subject: 'Coupe' };

interface Branch {
  id: number;
  x: number;
  y: number;
  angle: number;
  length: number;
  isWild: boolean;
}

export default function BonsaiTrimmer() {
  const { data: session } = useSession();
  
  // Game State
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // UI State
  const [studentStats, setStudentStats] = useState<{ average: number, streak: number, classId: string | null }>({ average: 0, streak: 0, classId: null });
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');

  const powerUps = useMemo(() => ({
    slowGrowth: studentStats.average >= 12,
    masterScissors: studentStats.average >= 16,
    streakMultiplier: Math.min(2.0, 1 + (studentStats.streak * 0.1))
  }), [studentStats]);

  // Init Data
  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(setStudentStats);
        getPersonalBest(session.user.id, GAME_KEY).then(setPersonalBest);
    }
  }, [session]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setGameOver(false);
    setGameStarted(true);
    setBranches([]);
  };

  const endGame = useCallback(() => {
    setGameOver(true);
    if (session?.user?.id) {
        saveGameScore(session.user.id, GAME_KEY, score);
    }
  }, [session, score]);

  // Timer
  useEffect(() => {
    if (gameStarted && !gameOver && timeLeft > 0) {
        const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(timer);
    } else if (timeLeft === 0 && !gameOver && gameStarted) {
        endGame();
    }
  }, [gameStarted, gameOver, timeLeft, endGame]);

  // Branch Spawner
  useEffect(() => {
    if (gameStarted && !gameOver) {
        const spawnRate = powerUps.slowGrowth ? BRANCH_SPAWN_RATE * 1.5 : BRANCH_SPAWN_RATE;
        const spawner = setInterval(() => {
            const newBranch: Branch = {
                id: Date.now(),
                x: 50, // Toujours au centre (tronc)
                y: 30 + Math.random() * 50, // Différentes hauteurs sur le tronc
                angle: Math.random() > 0.5 ? 160 + Math.random() * 40 : -20 - Math.random() * 40, // Gauche ou Droite
                length: 60 + Math.random() * 80,
                isWild: true
            };
            setBranches(prev => [...prev, newBranch]);
        }, spawnRate);
        return () => clearInterval(spawner);
    }
  }, [gameStarted, gameOver, powerUps.slowGrowth]);

  const trimBranch = (id: number) => {
    if (!gameStarted || gameOver) return;
    
    setBranches(prev => prev.filter(b => b.id !== id));
    const basePoints = 50;
    const finalPoints = Math.round(basePoints * powerUps.streakMultiplier * (powerUps.masterScissors ? 1.5 : 1));
    setScore(s => s + finalPoints);
    
    // Small time bonus for clean cut
    setTimeLeft(t => Math.min(INITIAL_TIME, t + 0.3));
  };

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    const scopeClassId = lbScope === 'class' ? (studentStats.classId ?? undefined) : undefined;
    const data = await getLeaderboard(GAME_KEY, scopeClassId);
    setLeaderboard(data);
    setLoadingLeaderboard(false);
  }, [lbScope, studentStats.classId]);

  useEffect(() => { if (showLeaderboard) fetchLeaderboard(); }, [showLeaderboard, fetchLeaderboard]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 p-4 font-sans overflow-hidden select-none">
      
      {/* Header / Stats */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-stone-200 text-stone-400 shadow-sm"><X /></Link>
        <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-2xl border border-stone-200 text-stone-900 font-black shadow-sm">Score: {score}</div>
            <div className={`bg-white px-4 py-2 rounded-2xl border border-stone-200 font-black shadow-sm ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-stone-600'}`}>Temps: {timeLeft}s</div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-stone-200 text-blue-500 shadow-sm hover:bg-stone-50"><Zap size={20}/></button>
            <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-stone-200 text-amber-500 shadow-sm hover:bg-stone-50"><Trophy size={20}/></button>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative w-full max-w-2xl aspect-square bg-white rounded-[3rem] border-8 border-stone-200 shadow-2xl overflow-hidden cursor-crosshair">
        
        {/* Background / Dojo Decor */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-stone-200/50 backdrop-blur-sm border-t border-stone-300 flex items-center justify-center">
            <div className="w-48 h-12 bg-stone-800 rounded-full shadow-inner"></div> {/* Pot de Bonsai */}
        </div>

        {/* The Bonsai Core (Static) */}
        <div className="absolute left-1/2 bottom-[15%] -translate-x-1/2 w-4 h-64 bg-stone-800 rounded-full origin-bottom">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-800/20 rounded-full blur-3xl"></div>
        </div>

        {/* Wild Branches to Trim */}
        {branches.map(b => (
            <div 
                key={b.id}
                className="absolute pointer-events-none"
                style={{ 
                    left: `${b.x}%`, 
                    top: `${b.y}%`,
                    transform: `rotate(${b.angle}deg)`,
                }}
            >
                <div 
                    className="w-1 bg-red-900 rounded-full origin-left relative shadow-lg"
                    style={{ width: `${b.length}px`, height: '6px' }}
                >
                    {/* Only the tip (leaf) is clickable */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); trimBranch(b.id); }}
                        className="absolute -right-4 -top-4 w-10 h-10 flex items-center justify-center pointer-events-auto group transition-transform hover:scale-125 active:scale-90"
                    >
                        <span className="text-2xl drop-shadow-md">🍃</span>
                        <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 blur-md rounded-full transition-opacity"></div>
                    </button>
                    
                    {/* Master Scissors Visual Aid */}
                    {powerUps.masterScissors && (
                        <div className="absolute -inset-4 border-2 border-dashed border-blue-400/30 rounded-full animate-spin-slow"></div>
                    )}
                </div>
            </div>
        ))}

        {/* Overlays */}
        {(!gameStarted || gameOver) && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50/90 z-20 backdrop-blur-sm">
                <div className="text-center p-8 max-w-sm">
                    <div className="w-24 h-24 bg-emerald-900 rounded-full flex items-center justify-center text-white text-5xl mx-auto mb-6 shadow-2xl border-4 border-white">🌳</div>
                    <h2 className="text-4xl font-black mb-2 text-stone-900 uppercase tracking-tighter italic">Bonsai Trimmer</h2>
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-8">L'Art de la Coupe Parfaite</p>
                    
                    {gameOver && (
                        <div className="mb-8 p-6 bg-white rounded-3xl border border-stone-200 shadow-sm">
                            <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Maîtrise Atteinte</div>
                            <div className="text-4xl font-black text-stone-900">{score}</div>
                        </div>
                    )}

                    <button 
                        onClick={startGame} 
                        className="w-full py-5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                    >
                        {gameOver ? "Resculpter" : "Commencer la Taille"}
                        <Scissors size={20} />
                    </button>
                    
                    {!gameStarted && (
                        <p className="mt-6 text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
                            Supprimez les branches rouges avant la fin du temps
                        </p>
                    )}
                </div>
            </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em]">
          Subject : {GAME_INFO.subject}
        </p>
        <p className="text-stone-300 text-[8px] font-bold uppercase tracking-[0.5em]">
          Skilla Precision Training
        </p>
      </div>
      
      {/* Advantages Modal */}
      {showAdvantages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdvantages(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter">Esprit du Jardinier</h3>
                <button onClick={() => setShowAdvantages(false)} className="text-stone-300 hover:text-stone-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-5 bg-orange-50 rounded-[1.5rem] border border-orange-100">
                    <div>
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Série Actuelle</p>
                        <p className="text-lg font-black text-orange-900">Multiplicateur x{powerUps.streakMultiplier.toFixed(1)}</p>
                    </div>
                    <span className="text-3xl">🔥</span>
                 </div>
                 <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all ${powerUps.masterScissors ? 'bg-blue-50 border-blue-100 shadow-sm shadow-blue-100' : 'bg-stone-50 border-stone-100 opacity-40'}`}>
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Moyenne &gt; 16</p>
                        <p className="text-sm font-bold text-blue-900">Ciseaux de Maître (Score +50%)</p>
                    </div>
                    <span className="text-2xl">✂️</span>
                 </div>
                 <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all ${powerUps.slowGrowth ? 'bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-100' : 'bg-stone-50 border-stone-100 opacity-40'}`}>
                    <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Moyenne &gt; 12</p>
                        <p className="text-sm font-bold text-emerald-900">Croissance Zen (Vitesse -33%)</p>
                    </div>
                    <span className="text-2xl">🌿</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b border-stone-50 bg-stone-50/50 flex justify-between items-center">
                 <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter">Maîtres du Bonsai</h3>
                 <button onClick={() => setShowLeaderboard(false)} className="text-stone-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="p-6">
                 <div className="flex bg-stone-100 p-1 rounded-2xl mb-6">
                    <button onClick={() => setLbScope('class')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${lbScope === 'class' ? 'bg-white text-stone-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mon Dojo</button>
                    <button onClick={() => setLbScope('school')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${lbScope === 'school' ? 'bg-white text-stone-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>L'Empire</button>
                 </div>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {loadingLeaderboard ? (
                        <div className="py-10 text-center text-stone-400 font-bold animate-pulse uppercase tracking-widest text-xs">Recherche des maîtres...</div>
                    ) : leaderboard.length > 0 ? (
                        leaderboard.map((s, i) => (
                            <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${s.userName === session?.user?.name ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 border-stone-100'}`}>
                                <div className="flex items-center gap-4">
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-stone-300 text-black' : i === 2 ? 'bg-orange-400 text-black' : s.userName === session?.user?.name ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-500'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="font-bold text-sm">{s.userName}</span>
                                </div>
                                <span className={`font-black ${s.userName === session?.user?.name ? 'text-amber-400' : 'text-stone-900'}`}>{s.score}</span>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-stone-400 font-bold uppercase tracking-widest text-xs">Aucun jardinier répertorié...</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
