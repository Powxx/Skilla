"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X, Shield, Heart, Trophy, Zap, AlertCircle } from "lucide-react";

// Configuration
const GAME_KEY = 'skin-defense';
const GRID_SIZE = 10;
const PATH = [{r:0,c:0}, {r:0,c:5}, {r:5,c:5}, {r:5,c:9}];

export default function SkinDefense() {
  const { data: session } = useSession();
  
  // Game State
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [towers, setTowers] = useState<any[]>([]);
  const [enemies, setEnemies] = useState<any[]>([]);
  
  // Stats & UI State
  const [studentStats, setStudentStats] = useState({ average: 0, streak: 0, classId: '' });
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');

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

  // Basic Game Loop
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
        // Spawn enemy
        setEnemies(prev => [...prev, { id: Date.now(), pos: 0, health: 100 }]);
    }, 2000);
    return () => clearInterval(interval);
  }, [gameOver]);

  // Update loop
  useEffect(() => {
    if (gameOver) return;
    const loop = setInterval(() => {
        setEnemies(prev => prev.map(e => ({...e, pos: e.pos + 0.05}))
            .filter(e => e.pos < PATH.length - 1));
    }, 100);
    return () => clearInterval(loop);
  }, [gameOver]);

  const placeTower = (r: number, c: number) => {
    if (towers.find(t => t.r === r && t.c === c)) return;
    setTowers(prev => [...prev, { r, c }]);
  };

  const handleGameOver = async (finalScore: number) => {
    setGameOver(true);
    if (session?.user?.id) {
        if (finalScore > personalBest) setPersonalBest(finalScore);
        await saveGameScore(session.user.id, GAME_KEY, finalScore);
        fetchLeaderboard();
    }
  };

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    const scopeClassId = lbScope === 'class' ? (studentStats.classId ?? undefined) : undefined;
    const data = await getLeaderboard(GAME_KEY, scopeClassId);
    setLeaderboard(data);
    setLoadingLeaderboard(false);
  }, [lbScope, studentStats.classId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 font-sans">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-slate-400"><X /></Link>
        <div className="text-center">
          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Biologie</div>
          <h1 className="text-2xl font-black uppercase">Skin Defense</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-blue-400"><Zap size={20}/></button>
            <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-amber-400"><Trophy size={20}/></button>
        </div>
      </div>

      {/* Stats HUD */}
      <div className="grid grid-cols-3 gap-4 mb-6 w-full max-w-md">
        <div className="bg-slate-800 p-3 rounded-2xl text-center"><div className="text-[9px] text-slate-500 uppercase">Vagues</div><div className="text-xl font-black">{wave}</div></div>
        <div className="bg-slate-800 p-3 rounded-2xl text-center"><div className="text-[9px] text-slate-500 uppercase">Score</div><div className="text-xl font-black">{score}</div></div>
        <div className="bg-slate-800 p-3 rounded-2xl text-center text-red-500"><div className="text-[9px] text-slate-500 uppercase">Vies</div><div className="text-xl font-black">{lives}</div></div>
      </div>

      {/* Grid */}
      <div className="bg-slate-800 p-2 rounded-3xl border-4 border-slate-700 shadow-2xl">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 30px)` }}>
            {Array.from({length: GRID_SIZE*GRID_SIZE}).map((_, i) => {
                const r = Math.floor(i / GRID_SIZE);
                const c = i % GRID_SIZE;
                const isTower = towers.find(t => t.r === r && t.c === c);
                return (
                    <div key={i} onClick={() => placeTower(r, c)} className="w-[30px] h-[30px] border border-slate-700/50 flex items-center justify-center cursor-pointer hover:bg-slate-700">
                        {isTower && '🧴'}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Modals and Overlays logic would follow same pattern as Sakura Mix */}
    </div>
  );
}
