"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X } from "lucide-react";

// Configuration
const GAME_KEY = 'katana-scissors-runner';
const SCISSORS_X = 15; // Un peu plus à droite pour mieux voir venir
const ENEMY_ICONS = ['🥷', '👹', '👺', '💣'];

export default function KatanaScissorsRunner() {
  const { data: session } = useSession();
  
  // Game State
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [scissorsY, setScissorsY] = useState(50); // Vertical
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

  const jump = () => {
    if (!gameStarted || gameOver) return;
    setVelocity(-2.8);
  };

  const update = useCallback(() => {
    if (!gameStarted || gameOver) return;

    // Gravity
    setVelocity(v => v + 0.18);
    setScissorsY(y => Math.max(0, Math.min(90, y + velocity)));

  // Move obstacles Right to Left (Enemies and Coins)
    setObstacles(prev => {
        const next = prev.map(o => ({...o, x: o.x - 1.2}));
        // On garde une petite marge pour la suppression
        return next.filter(o => o.x > -15);
    });

    // Collision
    setObstacles(prev => {
        let hit = false;
        const remaining = prev.filter(o => {
            const isCollision = Math.abs(o.x - SCISSORS_X) < 6 && Math.abs(o.y - scissorsY) < 8;
            if (isCollision) {
                if (o.type === 'ENEMY') {
                    setLives(l => {
                        const next = l - 1;
                        if (next <= 0) {
                            setGameOver(true);
                            saveGameScore(session?.user?.id || '', GAME_KEY, score);
                        }
                        return next;
                    });
                } else if (o.type === 'COIN') {
                    setScore(s => s + Math.floor(20 * powerUps.streakMultiplier * (powerUps.scoreDouble ? 2 : 1)));
                }
                hit = true;
                return false;
            }
            return true;
        });
        return remaining;
    });

    gameLoop.current = requestAnimationFrame(update);
  }, [gameStarted, gameOver, velocity, scissorsY, powerUps, score, session]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
        gameLoop.current = requestAnimationFrame(update);
        
        const spawner = setInterval(() => {
            const isEnemy = Math.random() > 0.3;
            const newObstacle = {
                id: Math.random(), // ID unique simple
                type: isEnemy ? 'ENEMY' : 'COIN',
                icon: isEnemy ? ENEMY_ICONS[Math.floor(Math.random() * ENEMY_ICONS.length)] : '⭐',
                x: 105, 
                y: 10 + Math.random() * 75
            };
            setObstacles(prev => [...prev, newObstacle]);
        }, 1000);

        return () => { 
            if (gameLoop.current) cancelAnimationFrame(gameLoop.current); 
            clearInterval(spawner); 
        };
    }
  }, [gameStarted, gameOver, update]);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    const scopeClassId = lbScope === 'class' ? (studentStats.classId ?? undefined) : undefined;
    const data = await getLeaderboard(GAME_KEY, scopeClassId);
    setLeaderboard(data);
    setLoadingLeaderboard(false);
  }, [lbScope, studentStats.classId]);

  useEffect(() => { if (showLeaderboard) fetchLeaderboard(); }, [showLeaderboard, fetchLeaderboard]);

  return (
    <div className="relative h-screen bg-slate-950 overflow-hidden touch-none" onClick={jump}>
      
      {/* Background Decor (Scrolling lines for speed feel) */}
      <div className="absolute inset-0 opacity-10">
          <div className="absolute h-px w-full bg-slate-500 top-1/4 animate-pulse"></div>
          <div className="absolute h-px w-full bg-slate-500 top-2/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute h-px w-full bg-slate-500 top-3/4 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* HUD & Header */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-white font-black shadow-lg">Score: {score}</div>
        <div className="bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-red-500 font-black shadow-lg">HP: {lives}</div>
      </div>
      
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); setShowAdvantages(true); }} className="h-12 w-12 flex items-center justify-center bg-slate-800/90 rounded-2xl border border-slate-700 text-blue-400 shadow-lg">⚡</button>
        <button onClick={(e) => { e.stopPropagation(); setShowLeaderboard(true); }} className="h-12 w-12 flex items-center justify-center bg-slate-800/90 rounded-2xl border border-slate-700 text-amber-400 shadow-lg">🏆</button>
      </div>
      
      {/* Katana (Player) */}
      <div className="absolute text-6xl transition-transform" style={{ left: `${SCISSORS_X}%`, top: `${scissorsY}%`, transform: `rotate(${velocity * 10}deg)` }}>⚔️</div>

      {/* Items (Enemies and Stars) */}
      {obstacles.map(o => (
        <div key={o.id} className="absolute text-5xl drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
            {o.icon}
        </div>
      ))}

      {(!gameStarted || gameOver) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-md">
          <div className="text-center text-white p-8 bg-slate-900 border border-slate-700 rounded-[3rem] shadow-2xl max-w-sm w-full mx-4">
            <h2 className="text-5xl font-black mb-2 italic tracking-tighter text-red-600">KATANA</h2>
            <p className="text-slate-400 uppercase text-xs font-black tracking-[0.3em] mb-8">Rush & Slay</p>
            
            {gameOver && <div className="mb-8 text-3xl font-black">SCORE: {score}</div>}
            
            <div className="space-y-4">
                <button onClick={(e) => { e.stopPropagation(); setGameStarted(true); setGameOver(false); setScore(0); setObstacles([]); setLives(maxLives); }} className="w-full py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase tracking-widest transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                    {gameOver ? "Ressusciter" : "Entrer dans l'Arène"}
                </button>
                <Link href="/student/games" className="block w-full py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase tracking-widest transition-all">
                    Battre en Retraite
                </Link>
            </div>
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
