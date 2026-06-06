"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getPersonalBest, getStudentStats } from '@/app/actions/gamification';

const TRACK_WIDTH = 100;
const SCISSORS_Y = 80;

export default function KatanaScissorsRunner() {
  const { data: session } = useSession();
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scissorsPos, setScissorsPos] = useState(50); // 0-100%
  const [obstacles, setObstacles] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [studentStats, setStudentStats] = useState({ average: 0, streak: 0 });
  const [personalBest, setPersonalBest] = useState(0);

  useEffect(() => {
    if (session?.user?.id) {
        getStudentStats(session.user.id).then(setStudentStats);
        getPersonalBest(session.user.id, 'katana-scissors-runner').then(setPersonalBest);
    }
  }, [session]);

  const powerUps = useMemo(() => ({
    slowMo: studentStats.average >= 12,
    scoreDouble: studentStats.average >= 16
  }), [studentStats]);

  const gameLoop = useRef<number>();
  
  const moveGame = useCallback(() => {
    if (gameOver || !gameStarted) return;
    
    // Move obstacles
    setObstacles(prev => prev.map(o => ({...o, y: o.y + (powerUps.slowMo ? 0.75 : 1) * speed}))
        .filter(o => o.y < 100));

    // Collision detection
    obstacles.forEach(o => {
        if (Math.abs(o.y - SCISSORS_Y) < 5 && Math.abs(o.x - scissorsPos) < 10) {
            if (o.type === 'MOLE') setGameOver(true);
            else if (o.type === 'HAIR') {
                setScore(s => s + (powerUps.scoreDouble ? 20 : 10));
                setObstacles(prev => prev.filter(item => item.id !== o.id));
            }
        }
    });

    gameLoop.current = requestAnimationFrame(moveGame);
  }, [gameOver, gameStarted, speed, scissorsPos, powerUps]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
        gameLoop.current = requestAnimationFrame(moveGame);
        const spawner = setInterval(() => {
            setObstacles(prev => [...prev, {
                id: Date.now(),
                type: Math.random() > 0.4 ? 'HAIR' : 'MOLE',
                x: Math.random() * 80 + 10,
                y: -10
            }]);
            setSpeed(s => s + 0.05);
        }, 1000);
        return () => { cancelAnimationFrame(gameLoop.current!); clearInterval(spawner); };
    }
  }, [gameStarted, gameOver, moveGame]);

  return (
    <div className="relative h-screen bg-slate-950 overflow-hidden touch-none" 
         onMouseMove={(e) => setScissorsPos((e.clientX / window.innerWidth) * 100)}
         onTouchMove={(e) => setScissorsPos((e.touches[0].clientX / window.innerWidth) * 100)}>
      
      {/* Track */}
      <div className="absolute inset-0 bg-orange-100/10" />

      {/* Scissors (Player) */}
      <div className="absolute text-5xl transition-all duration-75" style={{ left: `${scissorsPos}%`, top: `${SCISSORS_Y}%` }}>✂️</div>

      {/* Items */}
      {obstacles.map(o => (
        <div key={o.id} className="absolute text-3xl" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
            {o.type === 'HAIR' ? '💇' : '⚫'}
        </div>
      ))}

      {(!gameStarted || gameOver) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center text-white">
            <h2 className="text-4xl font-black mb-4">Dino Scissors Rush</h2>
            <button onClick={() => { setGameStarted(true); setGameOver(false); setScore(0); setObstacles([]); }} className="px-8 py-4 bg-red-600 rounded-xl font-bold">Commencer</button>
          </div>
        </div>
      )}
    </div>
  );
}
