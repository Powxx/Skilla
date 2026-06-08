"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X, Trophy, Zap, MousePointer2 } from "lucide-react";

// Configuration
const GAME_KEY = 'calligraphy-flow';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const POINT_RADIUS = 25;
const BRUSH_SIZE = 14;

export default function CalligraphyFlow() {
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [targetPoint, setTargetPoint] = useState({ x: 0, y: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [pointHistory, setPointHistory] = useState<{x: number, y: number}[]>([]);
  
  // Stats & UI State
  const [studentStats, setStudentStats] = useState<{ average: number, streak: number, classId: string | null }>({ average: 0, streak: 0, classId: null });
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');

  const powerUps = useMemo(() => ({
    timeBoost: studentStats.average >= 12,
    scoreDouble: studentStats.average >= 16,
    streakMultiplier: Math.min(2.0, 1 + (studentStats.streak * 0.1))
  }), [studentStats]);

  // Init Data
  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(setStudentStats);
        getPersonalBest(session.user.id, GAME_KEY).then(setPersonalBest);
    }
  }, [session]);

  const generateNewTarget = useCallback(() => {
    setTargetPoint({
        x: 50 + Math.random() * (CANVAS_WIDTH - 100),
        y: 50 + Math.random() * (CANVAS_HEIGHT - 100)
    });
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(powerUps.timeBoost ? 75 : 60);
    setGameOver(false);
    setGameStarted(true);
    setPointHistory([]);
    generateNewTarget();
    
    // Clear canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const endGame = useCallback(() => {
    setGameOver(true);
    if (session?.user?.id) {
        saveGameScore(session.user.id, GAME_KEY, score);
    }
  }, [session, score]);

  // Redraw History on Canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      pointHistory.forEach((p, index) => {
        // Opacity based on age (last points are more opaque)
        const opacity = (index + 1) / pointHistory.length * 0.4;
        const size = BRUSH_SIZE * (0.5 + (index + 1) / pointHistory.length * 0.5);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15, 23, 42, ${opacity})`;
        ctx.fill();

        // Trace line between points for "flow"
        if (index > 0) {
          const prev = pointHistory[index - 1];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(15, 23, 42, ${opacity * 0.5})`;
          ctx.lineWidth = size / 2;
          ctx.stroke();
        }
      });
    }
  }, [pointHistory]);

  // Timer
  useEffect(() => {
    if (gameStarted && !gameOver && timeLeft > 0) {
        const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(timer);
    } else if (timeLeft === 0 && !gameOver && gameStarted) {
        endGame();
    }
  }, [gameStarted, gameOver, timeLeft, endGame]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!gameStarted || gameOver || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    // Check distance to target
    const dist = Math.sqrt(Math.pow(x - targetPoint.x, 2) + Math.pow(y - targetPoint.y, 2));

    if (dist < POINT_RADIUS) {
        // Add to history (max 5 points)
        setPointHistory(prev => {
          const next = [...prev, { x: targetPoint.x, y: targetPoint.y }];
          return next.length > 5 ? next.slice(1) : next;
        });

        // Time Bonus: +0.5s
        setTimeLeft(t => t + 0.5);

        // Increase score
        setScore(s => s + Math.round(10 * powerUps.streakMultiplier * (powerUps.scoreDouble ? 2 : 1)));
        
        // Move to next target
        generateNewTarget();
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans overflow-hidden select-none">
      
      {/* Header / Stats */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400 shadow-sm"><X /></Link>
        <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-slate-900 font-black shadow-sm min-w-[120px] text-center">Score: {score}</div>
            <div className={`bg-white px-4 py-2 rounded-2xl border border-slate-200 font-black shadow-sm min-w-[120px] text-center ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>Temps: {timeLeft.toFixed(1)}s</div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-blue-500 shadow-sm hover:bg-slate-50"><Zap size={20}/></button>
            <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-amber-500 shadow-sm hover:bg-slate-50"><Trophy size={20}/></button>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative w-full max-w-2xl aspect-[3/2] bg-white rounded-[2.5rem] border-8 border-slate-100 shadow-2xl overflow-hidden cursor-crosshair">
        
        {/* Paper Texture Effect (CSS only) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

        <canvas 
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full block"
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
        />

        {/* Target Indicator */}
        {gameStarted && !gameOver && (
            <div 
                className="absolute w-12 h-12 rounded-full border-4 border-slate-900/10 flex items-center justify-center animate-pulse pointer-events-none"
                style={{ 
                    left: `${(targetPoint.x / CANVAS_WIDTH) * 100}%`, 
                    top: `${(targetPoint.y / CANVAS_HEIGHT) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                <div className="w-3 h-3 bg-slate-900 rounded-full shadow-[0_0_10px_rgba(15,23,42,0.4)]"></div>
            </div>
        )}

        {/* Overlays */}
        {(!gameStarted || gameOver) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20 backdrop-blur-sm">
                <div className="text-center p-8 max-w-sm">
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-xl rotate-3">✒️</div>
                    <h2 className="text-4xl font-black mb-2 text-slate-900 uppercase tracking-tighter">Calligraphy Flow</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-8">Maîtrisez l'art du tracé Edo</p>
                    
                    {gameOver && (
                        <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Score Final</div>
                            <div className="text-3xl font-black text-slate-900">{score}</div>
                        </div>
                    )}

                    <button 
                        onClick={startGame} 
                        className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                    >
                        {gameOver ? "Réessayer" : "Commencer le Tracé"}
                    </button>
                    
                    {!gameStarted && (
                        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <MousePointer2 size={14} />
                            Suivez les points avec précision
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      <p className="mt-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
        L'élégance naît de la fluidité du geste
      </p>
      
      {/* Advantages Modal */}
      {showAdvantages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdvantages(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Bénédictions du Scribe</h3>
                <button onClick={() => setShowAdvantages(false)} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
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
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Maîtrise Académique</p>
                        <p className="text-sm font-bold text-emerald-900">Score Double (Moyenne &gt; 16)</p>
                    </div>
                    <span className="text-2xl">💎</span>
                 </div>
                 <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all ${powerUps.timeBoost ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Concentration Zen</p>
                        <p className="text-sm font-bold text-blue-900">+15s de Temps (Moyenne &gt; 12)</p>
                    </div>
                    <span className="text-2xl">⏳</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Grands Maîtres</h3>
                 <button onClick={() => setShowLeaderboard(false)} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="p-6">
                 <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                    <button onClick={() => setLbScope('class')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${lbScope === 'class' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mon Dojo</button>
                    <button onClick={() => setLbScope('school')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${lbScope === 'school' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>L'Empire</button>
                 </div>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {loadingLeaderboard ? (
                        <div className="py-10 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Recherche des maîtres...</div>
                    ) : leaderboard.length > 0 ? (
                        leaderboard.map((s, i) => (
                            <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${s.userName === session?.user?.name ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-4">
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-orange-400 text-black' : s.userName === session?.user?.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="font-bold text-sm">{s.userName}</span>
                                </div>
                                <span className={`font-black ${s.userName === session?.user?.name ? 'text-amber-400' : 'text-slate-900'}`}>{s.score}</span>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Le parchemin est encore vierge...</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
