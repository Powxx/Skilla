"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X } from "lucide-react";

// Configuration
const GAME_KEY = 'katana-scissors-runner';
const SCISSORS_X = 15; // Position X en %
const GRAVITY = 0.4;
const JUMP_FORCE = -8;
const ENEMY_ICONS = ['🥷', '👹', '👺', '💣'];
const COIN_ICON = '⭐';
const OBSTACLE_SPEED = 0.8; // Vitesse en % par frame
const SPAWN_INTERVAL = 1200; // ms

export default function KatanaScissorsRunner() {
  const { data: session } = useSession();
  
  // Physics Refs (pour éviter les problèmes de closure et de lag de state)
  const playerYRef = useRef(50);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<any[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const startTimeRef = useRef<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Visual State (pour le rendu React)
  const [visualState, setVisualState] = useState({
    playerY: 50,
    obstacles: [] as any[],
    score: 0,
    lives: 3,
    gameOver: false,
    gameStarted: false
  });

  const [maxLives, setMaxLives] = useState(3);
  const [studentStats, setStudentStats] = useState<{ average: number, streak: number, classId: string | null }>({ average: 0, streak: 0, classId: null });
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');

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
            livesRef.current = initialLives;
            setVisualState(v => ({ ...v, lives: initialLives }));
        });
        getPersonalBest(session.user.id, GAME_KEY).then(setPersonalBest);
    }
  }, [session]);

  const endGame = useCallback(() => {
    setVisualState(v => ({ ...v, gameOver: true }));
    if (session?.user?.id) {
        saveGameScore(session.user.id, GAME_KEY, scoreRef.current);
    }
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
  }, [session]);

  const update = useCallback((time: number) => {
    if (!visualState.gameStarted || visualState.gameOver) return;

    // Delta time could be used for frame-independent movement, but for simplicity we use constant steps
    // Update Speed Multiplier every 3 seconds (Accelerated from 5s)
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const newMultiplier = 1 + Math.floor(elapsed / 3) * 0.1;
    if (newMultiplier !== speedMultiplier) setSpeedMultiplier(newMultiplier);

    // Apply Physics
    velocityRef.current += GRAVITY;
    playerYRef.current += velocityRef.current;

    // Bounds check
    if (playerYRef.current < 0) {
        playerYRef.current = 0;
        velocityRef.current = 0;
    }
    if (playerYRef.current > 90) { // Ground
        playerYRef.current = 90;
        velocityRef.current = 0;
    }

    // Move obstacles
    const currentObstacles = obstaclesRef.current;
    const nextObstacles = [];
    
    for (let i = 0; i < currentObstacles.length; i++) {
        const o = currentObstacles[i];
        o.x -= OBSTACLE_SPEED * speedMultiplier;

        // Collision Check
        const distX = Math.abs(o.x - SCISSORS_X);
        const distY = Math.abs(o.y - playerYRef.current);
        
        if (distX < 5 && distY < 8) {
            // Hit!
            if (o.type === 'ENEMY') {
                livesRef.current -= 1;
                if (livesRef.current <= 0) {
                    endGame();
                    return;
                }
            } else if (o.type === 'COIN') {
                scoreRef.current += Math.round(20 * powerUps.streakMultiplier * (powerUps.scoreDouble ? 2 : 1));
            }
            // Remove obstacle after hit
            continue;
        }

        if (o.x > -10) {
            nextObstacles.push(o);
        } else {
            // Passed!
            if (o.type === 'ENEMY') {
                scoreRef.current += Math.round(5 * powerUps.streakMultiplier);
            }
        }
    }
    obstaclesRef.current = nextObstacles;

    // Update Visual State
    setVisualState(v => ({
        ...v,
        playerY: playerYRef.current,
        obstacles: [...obstaclesRef.current],
        score: scoreRef.current,
        lives: livesRef.current
    }));

    frameIdRef.current = requestAnimationFrame(update);
  }, [visualState.gameStarted, visualState.gameOver, powerUps, endGame]);

  const jump = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (!visualState.gameStarted || visualState.gameOver) return;
    velocityRef.current = JUMP_FORCE;
  };

  // Spawner
  useEffect(() => {
    let spawner: NodeJS.Timeout;
    if (visualState.gameStarted && !visualState.gameOver) {
        spawner = setInterval(() => {
            const isEnemy = Math.random() > 0.2;
            const newObstacle = {
                id: Math.random(),
                type: isEnemy ? 'ENEMY' : 'COIN',
                icon: isEnemy ? ENEMY_ICONS[Math.floor(Math.random() * ENEMY_ICONS.length)] : COIN_ICON,
                x: 110,
                y: 10 + Math.random() * 80 // Différentes hauteurs
            };
            obstaclesRef.current.push(newObstacle);
        }, SPAWN_INTERVAL);
    }
    return () => clearInterval(spawner);
  }, [visualState.gameStarted, visualState.gameOver]);

  // Start Loop
  useEffect(() => {
    if (visualState.gameStarted && !visualState.gameOver) {
        frameIdRef.current = requestAnimationFrame(update);
    }
    return () => {
        if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [visualState.gameStarted, visualState.gameOver, update]);

  const startGame = () => {
    scoreRef.current = 0;
    livesRef.current = maxLives;
    playerYRef.current = 50;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    startTimeRef.current = Date.now();
    setSpeedMultiplier(1);
    setVisualState({
        playerY: 50,
        obstacles: [],
        score: 0,
        lives: maxLives,
        gameOver: false,
        gameStarted: true
    });
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 font-sans overflow-hidden select-none">
      
      {/* Header / Stats */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-4">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-slate-400"><X /></Link>
        <div className="flex gap-4">
            <div className="bg-slate-800/90 px-4 py-2 rounded-2xl border border-slate-700 text-white font-black">Score: {visualState.score}</div>
            <div className="bg-slate-800/90 px-4 py-2 rounded-2xl border border-slate-700 text-red-500 font-black">HP: {visualState.lives}</div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-blue-400">⚡</button>
            <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-amber-400">🏆</button>
        </div>
      </div>

      {/* Game Container */}
      <div 
        className="relative w-full max-w-2xl h-[400px] bg-slate-900 rounded-[2rem] border-4 border-slate-800 overflow-hidden shadow-2xl cursor-pointer" 
        onMouseDown={() => jump()}
        onTouchStart={() => jump()}
      >
        
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute h-px w-full bg-slate-500 top-1/4 animate-pulse"></div>
            <div className="absolute h-px w-full bg-slate-500 top-2/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute h-px w-full bg-slate-500 top-3/4 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Ground Line */}
        <div className="absolute bottom-[8%] w-full h-1 bg-slate-800/50 border-t border-slate-700/50"></div>

        {/* Katana (Player) */}
        <div 
            className="absolute text-5xl z-10" 
            style={{ 
                left: `${SCISSORS_X}%`, 
                top: `${visualState.playerY}%`, 
                transform: `translate(-50%, -50%) rotate(${velocityRef.current * 3}deg)` 
            }}
        >
            ⚔️
        </div>

        {/* Items (Enemies and Stars) */}
        {visualState.obstacles.map(o => (
            <div 
                key={o.id} 
                className={`absolute text-4xl z-10 ${o.type === 'ENEMY' ? 'drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]' : 'drop-shadow-[0_0_8px_rgba(255,255,0,0.6)]'}`} 
                style={{ 
                    left: `${o.x}%`, 
                    top: `${o.y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {o.icon}
            </div>
        ))}

        {/* Start / Game Over Screen */}
        {(!visualState.gameStarted || visualState.gameOver) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
                <div className="text-center text-white p-6">
                    <h2 className="text-4xl font-black mb-2 italic tracking-tighter text-red-600 uppercase">Katana Rush</h2>
                    {visualState.gameOver && (
                        <div className="mb-6">
                            <div className="text-2xl font-bold mb-1">DÉFAITE</div>
                            <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">Score Final: {visualState.score}</div>
                        </div>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); startGame(); }} 
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] active:scale-95"
                    >
                        {visualState.gameOver ? "Ressusciter" : "Entrer dans le Dojo"}
                    </button>
                    {!visualState.gameOver && (
                         <p className="mt-6 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Évitez les démons, tranchez le destin</p>
                    )}
                </div>
            </div>
        )}
      </div>

      <p className="mt-6 text-slate-500 text-xs font-black uppercase tracking-[0.3em] animate-bounce">
        {visualState.gameStarted && !visualState.gameOver ? "Sautez !" : "Cliquez pour commencer"}
      </p>
      
      {/* Advantages Modal */}
      {showAdvantages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdvantages(false)}>
           <div className="bg-slate-800 w-full max-w-sm rounded-[2rem] border border-slate-700 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-blue-400 uppercase tracking-tighter">Bénédictions du Sabreur</h3>
                <button onClick={() => setShowAdvantages(false)} className="text-slate-500"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-orange-600/10 rounded-2xl border border-orange-500/20">
                    <div>
                        <p className="text-xs font-black text-orange-500 uppercase">Série Actuelle</p>
                        <p className="text-xl font-black text-white">Multiplicateur x{powerUps.streakMultiplier.toFixed(1)}</p>
                    </div>
                    <span className="text-3xl">🔥</span>
                 </div>
                 <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${powerUps.scoreDouble ? 'bg-emerald-600/10 border-emerald-500/20' : 'bg-slate-900/50 border-slate-700 opacity-40'}`}>
                    <div>
                        <p className="text-xs font-black text-emerald-500 uppercase">Maîtrise Académique</p>
                        <p className="text-sm font-bold text-white">Score Double (Moyenne &gt; 16)</p>
                    </div>
                    <span className="text-2xl">💎</span>
                 </div>
                 <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${powerUps.extraLife ? 'bg-blue-600/10 border-blue-500/20' : 'bg-slate-900/50 border-slate-700 opacity-40'}`}>
                    <div>
                        <p className="text-xs font-black text-blue-500 uppercase">Endurance</p>
                        <p className="text-sm font-bold text-white">+1 Vie supplémentaire (Moyenne &gt; 12)</p>
                    </div>
                    <span className="text-2xl">🛡️</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}>
           <div className="bg-slate-800 w-full max-w-sm rounded-[2rem] border border-slate-700 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                 <h3 className="text-xl font-black text-amber-400 uppercase tracking-tighter">Légendes du Dojo</h3>
                 <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
              </div>
              <div className="p-4">
                 <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700 mb-4">
                    <button onClick={() => setLbScope('class')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${lbScope === 'class' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Mon Dojo</button>
                    <button onClick={() => setLbScope('school')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${lbScope === 'school' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>L'Empire</button>
                 </div>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {loadingLeaderboard ? (
                        <div className="py-10 text-center text-slate-500 font-bold animate-pulse">Chargement des maîtres...</div>
                    ) : leaderboard.length > 0 ? (
                        leaderboard.map((s, i) => (
                            <div key={i} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${s.userName === session?.user?.name ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-700/30 border-slate-600/50'}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-orange-400 text-black' : 'bg-slate-600 text-slate-300'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="font-bold text-sm text-slate-200">{s.userName}</span>
                                </div>
                                <span className="font-black text-amber-400">{s.score}</span>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-slate-500 font-bold">Aucun guerrier encore...</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
