"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X, Trophy, Zap, ArrowUpCircle } from "lucide-react";

// Configuration
const GAME_KEY = 'skin-defense';
const GRID_ROWS = 8; 
const GRID_COLS = 3;
const TOWER_COST = 60; 
const UPGRADE_COST = 100; 

// Définition des vagues
const WAVE_CONFIGS = [
  { count: 8, healthMult: 1.2, speedMult: 1.1 },
  { count: 12, healthMult: 1.8, speedMult: 1.2 },
  { count: 18, healthMult: 2.5, speedMult: 1.3 },
  { count: 25, healthMult: 3.5, speedMult: 1.4 },
  { count: 35, healthMult: 5.0, speedMult: 1.6 },
];

export default function SkinDefense() {
  const { data: session } = useSession();
  
  // Game State
  const [gold, setGold] = useState(120); 
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [enemiesSpawnedInWave, setEnemiesSpawnedInWave] = useState(0);
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

  const currentWaveConfig = useMemo(() => {
    return WAVE_CONFIGS[Math.min(wave - 1, WAVE_CONFIGS.length - 1)];
  }, [wave]);

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

  // Game Loop: Spawn Enemies
  useEffect(() => {
    if (gameOver) return;
    
    if (enemiesSpawnedInWave >= currentWaveConfig.count && enemies.length === 0) {
        setWave(prev => prev + 1);
        setEnemiesSpawnedInWave(0);
        setGold(prev => prev + 50);
        return;
    }

    if (enemiesSpawnedInWave < currentWaveConfig.count) {
        const interval = setInterval(() => {
            setEnemies(prev => [...prev, { 
                id: Date.now() + Math.random(), 
                r: -1, 
                c: 1, 
                health: 100 * currentWaveConfig.healthMult,
                maxHealth: 100 * currentWaveConfig.healthMult,
                speed: 0.1 * currentWaveConfig.speedMult
            }]);
            setEnemiesSpawnedInWave(prev => prev + 1);
        }, 2000 / currentWaveConfig.speedMult);
        return () => clearInterval(interval);
    }
  }, [gameOver, wave, enemiesSpawnedInWave, enemies.length, currentWaveConfig]);

  // Update loop: Tower Attack & Movement
  useEffect(() => {
    if (gameOver) return;
    const loop = setInterval(() => {
        // Move enemies
        setEnemies(prev => prev.map(e => ({...e, r: e.r + (e.speed || 0.1)}))
            .filter(e => {
                if (e.r >= GRID_ROWS) {
                    setLives(l => {
                        const next = l - 1;
                        if (next <= 0) {
                            setGameOver(true);
                            saveGameScore(session?.user?.id || '', GAME_KEY, wave);
                        }
                        return next;
                    });
                    return false;
                }
                return true;
            }));

        // Tower Attack
        setEnemies(prev => {
            let nextEnemies = [...prev];
            let newLasers: any[] = [];
            
            towers.forEach(t => {
                const range = t.level >= 2 ? 3 : 2;
                const damage = (powerUps.damageBoost ? 20 : 10) * (t.level || 1);
                
                const target = nextEnemies.find(e => Math.abs(e.r - t.r) <= range && Math.abs(e.c - t.c) <= 1);
                if (target) {
                    target.health -= damage;
                    newLasers.push({ 
                      id: Math.random(), 
                      fromR: t.r, fromC: t.c, toR: target.r, toC: target.c,
                      level: t.level || 1
                    });
                }
            });
            
            setLasers(newLasers);
            setTimeout(() => setLasers([]), 100);

            const killed = nextEnemies.filter(e => e.health <= 0).length;
            if (killed > 0) {
                setGold(g => g + killed * 12);
            }
            return nextEnemies.filter(e => e.health > 0);
        });
    }, 200);
    return () => clearInterval(loop);
  }, [gameOver, towers, powerUps, wave, session]);

  const handleCellClick = (r: number, c: number) => {
    const existingTowerIndex = towers.findIndex(t => t.r === r && t.c === c);
    
    if (existingTowerIndex !== -1) {
        // Upgrade existing tower
        const tower = towers[existingTowerIndex];
        const nextLevel = (tower.level || 1) + 1;
        const cost = UPGRADE_COST * tower.level;
        
        if (gold >= cost && tower.level < 3) {
            setGold(g => g - cost);
            const newTowers = [...towers];
            newTowers[existingTowerIndex] = { ...tower, level: nextLevel };
            setTowers(newTowers);
        }
    } else if (c !== 1) {
        // Place new tower
        if (gold >= TOWER_COST) {
            setTowers(prev => [...prev, { r, c, level: 1 }]);
            setGold(g => g - TOWER_COST);
        }
    }
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
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl text-center"><div className="text-[8px] text-slate-500 uppercase font-bold">Or</div><div className="text-lg font-black text-emerald-400">{gold}</div></div>
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl text-center"><div className="text-[8px] text-slate-500 uppercase font-bold">Vague</div><div className="text-lg font-black">{wave}</div></div>
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
                        onClick={() => handleCellClick(r, c)} 
                        className={`w-12 h-12 sm:w-16 sm:h-16 border border-white/5 flex items-center justify-center cursor-pointer transition-colors relative ${isPath ? 'bg-slate-950/50' : 'hover:bg-slate-800'}`}
                    >
                        {tower ? (
                            <div className="flex flex-col items-center">
                                <div className={`text-2xl sm:text-3xl animate-bounce-slow ${tower.level === 2 ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : tower.level === 3 ? 'drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]' : ''}`}>🧴</div>
                                <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                                    {Array.from({length: tower.level}).map((_, idx) => (
                                        <div key={idx} className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_3px_rgba(52,211,153,1)]" />
                                    ))}
                                </div>
                                {tower.level < 3 && gold >= (UPGRADE_COST * tower.level) && (
                                    <div className="absolute bottom-0.5 right-0.5 text-emerald-400 animate-pulse">
                                        <ArrowUpCircle size={12} />
                                    </div>
                                )}
                            </div>
                        ) : isPath ? (
                            <div className="w-0.5 h-0.5 bg-slate-800 rounded-full" />
                        ) : (
                            <div className="text-[8px] font-bold text-slate-800 opacity-0 hover:opacity-100 uppercase leading-none">Acheter</div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Enemies Layer */}
        {enemies.map(e => (
            <div 
                key={e.id} 
                className="absolute text-3xl sm:text-4xl z-20 transition-all duration-200 pointer-events-none drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                style={{ 
                    left: `${(e.c * 33.33) + 16.66}%`, 
                    top: `${(e.r / GRID_ROWS) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                🦠
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(e.health / e.maxHealth) * 100}%` }} />
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
                    stroke={l.level === 3 ? "rgba(245, 158, 11, 0.9)" : l.level === 2 ? "rgba(52, 211, 153, 0.9)" : "rgba(52, 211, 153, 0.6)"}
                    strokeWidth={l.level + 1}
                    strokeDasharray={l.level === 1 ? "5,5" : "none"}
                    className="animate-pulse"
                />
            ))}
        </svg>
      </div>
      
      <div className="mt-8 text-center text-slate-500">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Vague {wave} : {enemiesSpawnedInWave} / {currentWaveConfig.count} ennemis</p>
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] mt-1 italic">Tours Niv.2 (+Portée) • Niv.3 (+Dégâts)</p>
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] mt-0.5 text-slate-600">Appuyez sur une tour pour l'améliorer</p>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[200] backdrop-blur-md">
          <div className="text-center text-white p-10 bg-slate-900 border border-red-900/50 rounded-[3rem] shadow-2xl max-w-xs">
            <h2 className="text-4xl font-black mb-2 text-red-600 uppercase italic">Infecté !</h2>
            <p className="text-slate-400 mb-8 font-bold uppercase tracking-widest text-xs">La barrière cutanée a cédé</p>
            <div className="text-2xl font-black mb-8 italic">VAGUE ATTEINTE : {wave}</div>
            <button onClick={() => window.location.reload()} className="w-full py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all">Recommencer</button>
          </div>
        </div>
      )}

      {/* Advantages Modal */}
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

      {/* Leaderboard Modal */}
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
