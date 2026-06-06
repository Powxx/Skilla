"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X } from "lucide-react";

// Configuration
const GAME_KEY = 'katana-scissors-runner';
const SCISSORS_X = 10; // Position fixe des ciseaux du joueur

export default function KatanaScissorsRunner() {
  const { data: session } = useSession();
  
  // Game State
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [scissorsY, setScissorsY] = useState(50);
  const [obstacles, setObstacles] = useState<any[]>([]);
  const [velocity, setVelocity] = useState(0);
  
  // Stats & UI State
  const [studentStats, setStudentStats] = useState<{ average: number, streak: number, classId: string | null }>({ average: 0, streak: 0, classId: null });
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');

  const gameLoop = useRef<number | null>(null);

  const powerUps = useMemo(() => ({
    extraLife: studentStats.average >= 12,
    scoreDouble: studentStats.average >= 16,
    streakMultiplier: Math.min(2.0, 1 + (studentStats.streak * 0.1))
  }), [studentStats]);

  // Init Data
  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(stats => {
            setStudentStats(stats);
            const initialLives = stats.average >= 12 ? 4 : 3;
            setMaxLives(initialLives);
            setLives(initialLives);
        });
        getPersonalBest(session.user.id, GAME_KEY).then(setPersonalBest);
    }
  }, [session]);

  // Jump logic
  const jump = () => {
    if (!gameStarted || gameOver) return;
    setVelocity(-2);
  };

  // Game Loop
  const update = useCallback(() => {
    if (!gameStarted || gameOver) return;

    // Apply gravity
    setVelocity(v => v + 0.1);
    setScissorsY(y => Math.max(0, Math.min(90, y + velocity)));

    // Move obstacles
    setObstacles(prev => prev.map(o => ({...o, x: o.x - 1}))
        .filter(o => o.x > -10));

    // Collision
    obstacles.forEach(o => {
        if (Math.abs(o.x - SCISSORS_X) < 5 && Math.abs(o.y - scissorsY) < 10) {
            if (o.type === 'SCISSOR') {
                setLives(l => {
                    const next = l - 1;
                    if (next <= 0) {
                        setGameOver(true);
                        saveGameScore(session?.user?.id || '', GAME_KEY, score);
                    }
                    return next;
                });
                setObstacles(prev => prev.filter(item => item.id !== o.id));
            } else if (o.type === 'HAIR') {
                setScore(s => s + Math.floor(10 * powerUps.streakMultiplier * (powerUps.scoreDouble ? 2 : 1)));
                setObstacles(prev => prev.filter(item => item.id !== o.id));
            }
        }
    });

    gameLoop.current = requestAnimationFrame(update);
  }, [gameStarted, gameOver, velocity, scissorsY, obstacles, powerUps, score, session]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
        gameLoop.current = requestAnimationFrame(update);
        const spawner = setInterval(() => {
            setObstacles(prev => [...prev, {
                id: Date.now(),
                type: Math.random() > 0.3 ? 'HAIR' : 'SCISSOR',
                x: 100,
                y: Math.random() * 80 + 10
            }]);
        }, 800);
        return () => { cancelAnimationFrame(gameLoop.current!); clearInterval(spawner); };
    }
  }, [gameStarted, gameOver, update]);

  // Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    const scopeClassId = lbScope === 'class' ? (studentStats.classId ?? undefined) : undefined;
    const data = await getLeaderboard(GAME_KEY, scopeClassId);
    setLeaderboard(data);
    setLoadingLeaderboard(false);
  }, [lbScope, studentStats.classId]);

  useEffect(() => { if (showLeaderboard) fetchLeaderboard(); }, [showLeaderboard, fetchLeaderboard]);

  return (
    <div className="relative h-screen bg-slate-900 overflow-hidden touch-none" onClick={jump}>
      
      {/* HUD & Header */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-slate-800/80 p-3 rounded-2xl text-white font-black">Score: {score}</div>
        <div className="bg-slate-800/80 p-3 rounded-2xl text-red-500 font-black">Vies: {lives}</div>
      </div>
      
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-blue-400">⚡</button>
        <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-amber-400">🏆</button>
      </div>

      {/* Track */}
      <div className="absolute bottom-0 w-full h-20 bg-slate-800 border-t-4 border-slate-700" />

      {/* Scissors (Player) */}
      <div className="absolute text-5xl transition-all" style={{ left: `${SCISSORS_X}%`, top: `${scissorsY}%` }}>✂️</div>

      {/* Items */}
      {obstacles.map(o => (
        <div key={o.id} className="absolute text-4xl" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
            {o.type === 'HAIR' ? '💇' : '✂️'}
        </div>
      ))}

      {(!gameStarted || gameOver) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center text-white p-6">
            <h2 className="text-4xl font-black mb-2">{gameOver ? `Terminé! Score: ${score}` : "Katana Rush"}</h2>
            <button onClick={() => { setGameStarted(true); setGameOver(false); setScore(0); setObstacles([]); setLives(maxLives); }} className="px-8 py-4 bg-red-600 rounded-xl font-bold uppercase tracking-widest mt-4">
                {gameOver ? "Rejouer" : "Commencer"}
            </button>
            <Link href="/student/games" className="ml-4 px-8 py-4 bg-slate-700 rounded-xl font-bold uppercase tracking-widest">Quitter</Link>
          </div>
        </div>
      )}
      
      {/* Advantages Modal (Standardized) */}
      {showAdvantages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdvantages(false)}>
           <div className="bg-slate-800 w-full max-w-sm rounded-[2rem] border border-slate-700 p-6">
              <h3 className="text-xl font-black text-blue-400 mb-4 uppercase">Avantages Actifs</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-orange-600/10 rounded-2xl border border-orange-500/20">
                    <p className="text-xs font-black text-white">Série x{powerUps.streakMultiplier.toFixed(1)}</p>
                    <span className="text-2xl">🔥</span>
                 </div>
                 <div className={`p-4 rounded-2xl border ${powerUps.scoreDouble ? 'bg-emerald-600/10 border-emerald-500/20' : 'opacity-40'}`}>
                    <p className="text-xs font-black text-emerald-500">Moyenne &gt; 16 : Score x2</p>
                 </div>
                 <div className={`p-4 rounded-2xl border ${powerUps.extraLife ? 'bg-blue-600/10 border-blue-500/20' : 'opacity-40'}`}>
                    <p className="text-xs font-black text-blue-500">Moyenne &gt; 12 : +1 Vie</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Leaderboard Modal (Standardized) */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}>
           <div className="bg-slate-800 w-full max-w-sm rounded-[2rem] border border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                 <h3 className="text-xl font-black text-amber-400 uppercase">{lbScope === 'class' ? 'Top du Dojo' : 'Top de l\'Empire'}</h3>
                 <button onClick={() => setShowLeaderboard(false)} className="text-slate-400"><X /></button>
              </div>
              <div className="p-4">
                 <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700 mb-4">
                    <button onClick={() => setLbScope('class')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg ${lbScope === 'class' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Dojo</button>
                    <button onClick={() => setLbScope('school')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg ${lbScope === 'school' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Empire</button>
                 </div>
                 {leaderboard.map((s, i) => (
                    <div key={i} className="flex justify-between p-3 bg-slate-700/50 border border-slate-600 rounded-xl mb-2 text-white">
                        <span className="font-bold">#{i+1} {s.userName}</span>
                        <span className="font-black">{s.score}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
