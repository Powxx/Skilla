"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getPersonalBest, getStudentStats } from '@/app/actions/gamification';

const ITEM_TYPES = { 
  HAIR: { id: 'HAIR', icon: '💇', points: 10 }, 
  OBSTACLE: { id: 'OBSTACLE', icon: '🧊', points: 0 } 
};

export default function KatanaScissors() {
  const { data: session } = useSession();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [speed, setSpeed] = useState(2000);
  const [gameOver, setGameOver] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Slash Animation
  const [isSlicing, setIsSlicing] = useState(false);
  const [slashPoints, setSlashPoints] = useState<{x: number, y: number}[]>([]);

  // Stats pour bonus
  const [studentStats, setStudentStats] = useState({ average: 0, streak: 0 });
  const [personalBest, setPersonalBest] = useState(0);
  
  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(stats => {
            setStudentStats(stats);
            setMaxLives(stats.average >= 12 ? 4 : 3);
            setLives(stats.average >= 12 ? 4 : 3);
        });
        getPersonalBest(session.user.id, 'katana-scissors').then(setPersonalBest);
    }
  }, [session]);

  const scoreMultiplier = (studentStats.average >= 16 ? 2 : 1) * Math.min(2.0, 1 + (studentStats.streak * 0.1));

  // Spawn items
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      const newItem = {
        id: Date.now(),
        type: Math.random() > 0.3 ? ITEM_TYPES.HAIR : ITEM_TYPES.OBSTACLE,
        x: Math.random() * 80 + 10,
        y: -10,
      };
      setItems(prev => [...prev, newItem]);
      setSpeed(prev => Math.max(500, prev - 20));
    }, speed);
    return () => clearInterval(interval);
  }, [gameOver, speed]);

  // Handle Slash
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSlicing) return;
    
    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    
    setSlashPoints(prev => [...prev.slice(-10), {x: clientX, y: clientY}]);

    items.forEach(item => {
        const itemEl = document.getElementById(`item-${item.id}`);
        if(itemEl) {
            const rect = itemEl.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                handleSlash(item.id, item.type.id);
            }
        }
    });
  };

  const handleSlash = (id: string, type: string) => {
    if (gameOver) return;
    if (type === ITEM_TYPES.HAIR.id) {
      setScore(prev => prev + Math.floor(ITEM_TYPES.HAIR.points * scoreMultiplier));
    } else {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
            setGameOver(true);
            if(session?.user?.id) saveGameScore(session.user.id, 'katana-scissors', score);
        }
        return newLives;
      });
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div 
        className="relative h-screen bg-slate-950 overflow-hidden touch-none" 
        ref={containerRef}
        onMouseDown={() => setIsSlicing(true)}
        onMouseUp={() => { setIsSlicing(false); setSlashPoints([]); }}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsSlicing(true)}
        onTouchEnd={() => { setIsSlicing(false); setSlashPoints([]); }}
        onTouchMove={handleMouseMove}
    >
      {/* UI */}
      <div className="absolute top-4 left-4 z-10 text-white pointer-events-none">
        <div className="text-xl font-black">Score: {score}</div>
        <div className="text-xl font-black text-red-500">Vies: {lives} / {maxLives}</div>
        <div className="text-xs text-slate-400">Record: {personalBest}</div>
        <div className="mt-2 text-[10px] font-bold text-emerald-400 uppercase">Moy. &gt; 16 : Score x2</div>
        <div className="text-[10px] font-bold text-amber-400 uppercase">Moy. &gt; 12 : +1 Vie</div>
      </div>

      {/* Slash Trail */}
      <svg className="absolute inset-0 z-0 pointer-events-none">
          <polyline points={slashPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="white" strokeWidth="6" className="opacity-80" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Items */}
      {items.map(item => (
        <div
          key={item.id}
          id={`item-${item.id}`}
          className="absolute text-4xl animate-fall"
          style={{ left: `${item.x}%`, top: '110%' }}
        >
          {item.type.icon}
        </div>
      ))}

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center">
            <h2 className="text-4xl font-black text-white mb-4">Terminé! Score: {score}</h2>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold">Rejouer</button>
            <Link href="/student/games" className="ml-4 px-8 py-4 bg-slate-700 text-white rounded-xl font-bold">Quitter</Link>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        @keyframes fall {
          from { top: -10%; }
          to { top: 110%; }
        }
        .animate-fall {
          animation: fall ${speed / 1000}s linear forwards;
        }
      `}</style>
    </div>
  );
}
