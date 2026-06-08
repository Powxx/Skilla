"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X, Trophy, Zap } from "lucide-react";

// Configuration
const GAME_KEY = 'skin-defense';
const GRID_ROWS = 10;
const GRID_COLS = 3;
const TOWER_COST = 50;

export default function SkinDefense() {
  const { data: session } = useSession();
  
  // Game State
  const [score, setScore] = useState(100); 
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [towers, setTowers] = useState<any[]>([]);
  const [enemies, setEnemies] = useState<any[]>([]);
  const [lasers, setLasers] = useState<any[]>([]);
  
  // UI State
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState<{ average: number, streak: number, classId: string | null }>({ average: 0, streak: 0, classId: null });
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const powerUps = useMemo(() => ({
    damageBoost: studentStats.average >= 16,
    extraLife: studentStats.average >= 12,
    streakMultiplier: Math.min(2.0, 1 + (studentStats.streak * 0.1))
  }), [studentStats]);

  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(stats => {
            setStudentStats(stats);
            if (stats.average >= 12) setLives(4);
        });
        getPersonalBest(session.user.id, GAME_KEY).then(setPersonalBest);
    }
  }, [session]);

  // Game Loop: Spawn Enemies (Top to Bottom in col 1)
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
        setEnemies(prev => [...prev, { id: Date.now(), r: -1, c: 1, health: 100 * (1 + wave * 0.2) }]);
    }, 2000 - Math.min(1000, wave * 100));
    return () => clearInterval(interval);
  }, [gameOver, wave]);

  // Update loop: Tower Attack & Movement
  useEffect(() => {
    if (gameOver) return;
    const loop = setInterval(() => {
        // Move enemies down column 1
        setEnemies(prev => prev.map(e => ({...e, r: e.r + 0.1}))
            .filter(e => {
                if (e.r >= GRID_ROWS) {
                    setLives(l => {
                        const next = l - 1;
                        if (next <= 0) {
                            setGameOver(true);
                            saveGameScore(session?.user?.id || '', GAME_KEY, score);
                        }
                        return next;
                    });
                    return false;
                }
                return true;
            }));

        // Tower Attack logic
        setEnemies(prev => {
            let nextEnemies = [...prev];
            let newLasers: any[] = [];
            
            towers.forEach(t => {
                // Tower at (r, c) targets enemies in range
                const target = nextEnemies.find(e => Math.abs(e.r - t.r) <= 2 && Math.abs(e.c - t.c) <= 1);
                if (target) {
                    target.health -= (powerUps.damageBoost ? 20 : 10);
                    newLasers.push({ id: Math.random(), fromR: t.r, fromC: t.c, toR: target.r, toC: target.c });
                }
            });
            
            setLasers(newLasers);
            setTimeout(() => setLasers([]), 100); // Flash laser

            const killed = nextEnemies.filter(e => e.health <= 0).length;
            if (killed > 0) {
                setScore(s => s + killed * 20);
                if (score > 0 && score % 200 === 0) setWave(w => w + 1);
            }
            return nextEnemies.filter(e => e.health > 0);
        });
    }, 200);
    return () => clearInterval(loop);
  }, [gameOver, towers, powerUps, score, session]);

  const placeTower = (r: number, c: number) => {
    if (score < TOWER_COST || towers.find(t => t.r === r && t.c === c) || c === 1) return; // Path is col 1
    setTowers(prev => [...prev, { r, c }]);
    setScore(s => s - TOWER_COST);
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 font-sans overflow-hidden">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-slate-400"><X /></Link>
        <div className="text-center">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-emerald-500 leading-none">Skin Defense</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bacteriological War</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-blue-400"><Zap size={20}/></button>
            <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-amber-400"><Trophy size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6 w-full max-w-xs">
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl text-center"><div className="text-[8px] text-slate-500 uppercase font-bold">Gold</div><div className="text-lg font-black text-emerald-400">{score}</div></div>
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl text-center"><div className="text-[8px] text-slate-500 uppercase font-bold">Wave</div><div className="text-lg font-black">{wave}</div></div>
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl text-center text-red-500"><div className="text-[8px] text-slate-500 uppercase font-bold">HP</div><div className="text-lg font-black">{lives}</div></div>
      </div>

      <div className="relative bg-slate-900 p-1 rounded-2xl border-2 border-slate-800 shadow-2xl overflow-hidden">
        {/* The Grid */}
        <div className="grid grid-cols-3 gap-1 relative z-10">
            {Array.from({length: GRID_ROWS * GRID_COLS}).map((_, i) => {
                const r = Math.floor(i / GRID_COLS);
                const c = i % GRID_COLS;
                const tower = towers.find(t => t.r === r && t.c === c);
                const isPath = c === 1;
                return (
                    <div 
                        key={i} 
                        onClick={() => placeTower(r, c)} 
                        className={`w-16 h-16 sm:w-20 sm:h-20 border border-white/5 flex items-center justify-center cursor-pointer transition-colors ${isPath ? 'bg-slate-950/50' : 'hover:bg-slate-800'}`}
                    >
                        {tower ? (
                            <div className="text-3xl sm:text-4xl animate-bounce-slow">🧴</div>
                        ) : isPath ? (
                            <div className="w-1 h-1 bg-slate-800 rounded-full" />
                        ) : (
                            <div className="text-[10px] font-bold text-slate-800 opacity-0 hover:opacity-100 uppercase">Buy</div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Enemies Layer */}
        {enemies.map(e => (
            <div 
                key={e.id} 
                className="absolute text-4xl sm:text-5xl z-20 transition-all duration-200 pointer-events-none drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                style={{ 
                    left: `${(e.c * 33.33) + 16.66}%`, 
                    top: `${(e.r / GRID_ROWS) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                🦠
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(e.health / (100 * (1 + wave * 0.2))) * 100}%` }} />
                </div>
            </div>
        ))}

        {/* Lasers Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            {lasers.map(l => (
                <line 
                    key={l.id}
                    x1={`${(l.fromC * 33.33) + 16.66}%`}
                    y1={`${((l.fromR + 0.5) / GRID_ROWS) * 100}%`}
                    x2={`${(l.toC * 33.33) + 16.66}%`}
                    y2={`${((l.toR + 0.5) / GRID_ROWS) * 100}%`}
                    stroke="rgba(52, 211, 153, 0.8)"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    className="animate-pulse"
                />
            ))}
        </svg>
      </div>
      
      <div className="mt-8 text-center text-slate-500">
        <p className="text-xs font-bold uppercase tracking-widest">Tap on the sides to place towers (50 Gold)</p>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[200] backdrop-blur-md">
          <div className="text-center text-white p-10 bg-slate-900 border border-red-900/50 rounded-[3rem] shadow-2xl max-w-xs">
            <h2 className="text-4xl font-black mb-2 text-red-600 uppercase italic">Infected!</h2>
            <p className="text-slate-400 mb-8 font-bold uppercase tracking-widest text-xs">The skin has been compromised</p>
            <div className="text-2xl font-black mb-8">SCORE: {score}</div>
            <button onClick={() => window.location.reload()} className="w-full py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all">Retry</button>
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
                 <div className={`p-4 rounded-2xl border ${powerUps.damageBoost ? 'bg-emerald-600/10 border-emerald-500/20' : 'opacity-40'}`}>
                    <p className="text-xs font-black text-emerald-500">Moyenne &gt; 16 : Dégâts x2</p>
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
