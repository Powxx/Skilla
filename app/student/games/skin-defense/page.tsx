"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { X, Trophy, Zap } from "lucide-react";

// Configuration
const GAME_KEY = 'skin-defense';
const GRID_SIZE = 10;
const TOWER_COST = 50;

export default function SkinDefense() {
  const { data: session } = useSession();
  
  // Game State
  const [score, setScore] = useState(100); // Currency/Points
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [towers, setTowers] = useState<any[]>([]);
  const [enemies, setEnemies] = useState<any[]>([]);
  
  // UI State
  const [personalBest, setPersonalBest] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState({ average: 0, streak: 0, classId: '' });

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

  // Game Loop: Enemies
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
        setEnemies(prev => [...prev, { id: Date.now(), x: 0, y: 0, health: 100 * wave }]);
    }, 2000);
    return () => clearInterval(interval);
  }, [gameOver, wave]);

  // Game Loop: Towers & Movement
  useEffect(() => {
    if (gameOver) return;
    const loop = setInterval(() => {
        // Move enemies
        setEnemies(prev => prev.map(e => ({...e, x: e.x + 1}))
            .filter(e => {
                if (e.x >= GRID_SIZE) {
                    setLives(l => {
                        if (l <= 1) setGameOver(true);
                        return l - 1;
                    });
                    return false;
                }
                return true;
            }));

        // Tower Attack
        setEnemies(prev => {
            let nextEnemies = [...prev];
            towers.forEach(t => {
                const target = nextEnemies.find(e => Math.abs(e.x - t.c) <= 2 && Math.abs(e.y - t.r) <= 2);
                if (target) {
                    target.health -= (powerUps.damageBoost ? 20 : 10);
                }
            });
            const killed = nextEnemies.filter(e => e.health <= 0).length;
            setScore(s => s + killed * 20);
            return nextEnemies.filter(e => e.health > 0);
        });
    }, 500);
    return () => clearInterval(loop);
  }, [gameOver, towers, powerUps]);

  const placeTower = (r: number, c: number) => {
    if (score < TOWER_COST || towers.find(t => t.r === r && t.c === c)) return;
    setTowers(prev => [...prev, { r, c }]);
    setScore(s => s - TOWER_COST);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 font-sans">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-slate-400"><X /></Link>
        <h1 className="text-2xl font-black uppercase">Skin Defense</h1>
        <div className="flex gap-2">
            <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-blue-400"><Zap size={20}/></button>
            <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-amber-400"><Trophy size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 w-full max-w-md">
        <div className="bg-slate-800 p-3 rounded-2xl text-center"><div className="text-[9px] text-slate-500 uppercase">Or</div><div className="text-xl font-black text-emerald-400">{score}</div></div>
        <div className="bg-slate-800 p-3 rounded-2xl text-center"><div className="text-[9px] text-slate-500 uppercase">Vagues</div><div className="text-xl font-black">{wave}</div></div>
        <div className="bg-slate-800 p-3 rounded-2xl text-center text-red-500"><div className="text-[9px] text-slate-500 uppercase">Vies</div><div className="text-xl font-black">{lives}</div></div>
      </div>

      <div className="bg-slate-800 p-2 rounded-3xl border-4 border-slate-700 shadow-2xl">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 30px)` }}>
            {Array.from({length: GRID_SIZE*GRID_SIZE}).map((_, i) => {
                const r = Math.floor(i / GRID_SIZE);
                const c = i % GRID_SIZE;
                const isTower = towers.find(t => t.r === r && t.c === c);
                const enemy = enemies.find(e => Math.floor(e.x) === c && Math.floor(e.y) === r);
                return (
                    <div key={i} onClick={() => placeTower(r, c)} className="w-[30px] h-[30px] border border-slate-700/50 flex items-center justify-center cursor-pointer hover:bg-slate-700">
                        {isTower ? '🧴' : enemy ? '🦠' : ''}
                    </div>
                );
            })}
        </div>
      </div>
      
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center text-white p-6">
            <h2 className="text-4xl font-black mb-4">Défense percée !</h2>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-red-600 rounded-xl font-bold uppercase">Rejouer</button>
          </div>
        </div>
      )}
    </div>
  );
}
