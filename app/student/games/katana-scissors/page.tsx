"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';

const ITEM_TYPES = { HAIR: '💇', OBSTACLE: '🧊' };

export default function KatanaScissors() {
  const { data: session } = useSession();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [speed, setSpeed] = useState(2000); // ms per item
  const [gameOver, setGameOver] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stats pour bonus
  const [studentStats, setStudentStats] = useState({ average: 0, streak: 0, classId: '' });
  
  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(setStudentStats);
    }
  }, [session]);

  const streakMultiplier = Math.min(2.0, 1 + (studentStats.streak * 0.1));

  // Spawn items
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      const newItem = {
        id: Date.now(),
        type: Math.random() > 0.3 ? ITEM_TYPES.HAIR : ITEM_TYPES.OBSTACLE,
        x: Math.random() * 80 + 10, // 10% to 90%
      };
      setItems(prev => [...prev, newItem]);
      setSpeed(prev => Math.max(500, prev - 20)); // Augmente la vitesse
    }, speed);
    return () => clearInterval(interval);
  }, [gameOver, speed]);

  const handleSlash = (id: string, type: string) => {
    if (gameOver) return;
    if (type === ITEM_TYPES.HAIR) {
      setScore(prev => prev + Math.floor(10 * streakMultiplier));
    } else {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) setGameOver(true);
        return newLives;
      });
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="relative h-screen bg-slate-950 overflow-hidden touch-none" ref={containerRef}>
      {/* UI */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <div className="text-xl font-black">Score: {score}</div>
        <div className="text-xl font-black text-red-500">Vies: {lives}</div>
      </div>

      {/* Items */}
      {items.map(item => (
        <div
          key={item.id}
          className="absolute text-4xl animate-fall cursor-pointer"
          style={{ left: `${item.x}%`, top: '-10%' }}
          onClick={() => handleSlash(item.id, item.type)}
        >
          {item.type}
        </div>
      ))}

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center">
            <h2 className="text-4xl font-black text-white mb-4">Terminé! Score: {score}</h2>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold">Rejouer</button>
          </div>
        </div>
      )}

      {/* Styles pour l'animation */}
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
