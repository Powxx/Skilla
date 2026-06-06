"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';

const GRID_SIZE = 8;
const COLORS = ['🌸', '🍶', '🏮', '🍱', '⛩️', '🎐'];
const SPECIALS = {
  EXPLOSION: '💥', // Ligne de 4
  COLOR_BOMB: '⭐'  // Ligne de 5
};

export default function SakuraMix() {
  const { data: session } = useSession();
  const [grid, setGrid] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [selectedTile, setSelectedTile] = useState<{ r: number, c: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  
  // Stats & Power-ups
  const [studentStats, setStudentStats] = useState<{ average: number, streak: number, classId: string | null }>({ average: 0, streak: 0, classId: null });
  const [shieldActive, setShieldActive] = useState(false);
  const [timeFrozen, setTimeFrozen] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const powerUps = useMemo(() => ({
    timeFreeze: studentStats.average >= 16,
    shield: studentStats.average >= 13,
    scoreDouble: studentStats.average >= 10,
    streakMultiplier: Math.min(2.0, 1 + (studentStats.streak * 0.1))
  }), [studentStats]);

  // --- FETCH STATS ---
  const fetchStats = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const stats = await getStudentStats(session.user.id);
        setStudentStats(stats);
        setShieldActive(stats.average >= 13);
        const pb = await getPersonalBest(session.user.id, 'sakura-mix');
        setPersonalBest(pb);
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    }
  }, [session]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // --- LOGIQUE DE MATCHING ---
  const checkMatches = useCallback((currentGrid: string[][]) => {
    const horizontalMatches: { r: number, c: number }[][] = [];
    const verticalMatches: { r: number, c: number }[][] = [];
    
    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      let currentMatch: {r: number, c: number}[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = currentGrid[r][c];
        if (tile && !Object.values(SPECIALS).includes(tile)) {
          if (currentMatch.length > 0 && currentGrid[r][c] === currentGrid[currentMatch[0].r][currentMatch[0].c]) {
            currentMatch.push({r, c});
          } else {
            if (currentMatch.length >= 3) horizontalMatches.push(currentMatch);
            currentMatch = [{r, c}];
          }
        } else {
          if (currentMatch.length >= 3) horizontalMatches.push(currentMatch);
          currentMatch = [];
        }
      }
      if (currentMatch.length >= 3) horizontalMatches.push(currentMatch);
    }
    
    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      let currentMatch: {r: number, c: number}[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        const tile = currentGrid[r][c];
        if (tile && !Object.values(SPECIALS).includes(tile)) {
          if (currentMatch.length > 0 && currentGrid[r][c] === currentGrid[currentMatch[0].r][currentMatch[0].c]) {
            currentMatch.push({r, c});
          } else {
            if (currentMatch.length >= 3) verticalMatches.push(currentMatch);
            currentMatch = [{r, c}];
          }
        } else {
          if (currentMatch.length >= 3) verticalMatches.push(currentMatch);
          currentMatch = [];
        }
      }
      if (currentMatch.length >= 3) verticalMatches.push(currentMatch);
    }
    
    return { horizontal: horizontalMatches, vertical: verticalMatches };
  }, []);

  // --- EXPLOSION LOGIC ---
  const triggerExplosion = (r: number, c: number, workingGrid: string[][]) => {
    for (let i = Math.max(0, r - 1); i <= Math.min(GRID_SIZE - 1, r + 1); i++) {
      for (let j = Math.max(0, c - 1); j <= Math.min(GRID_SIZE - 1, c + 1); j++) {
        workingGrid[i][j] = '';
      }
    }
  };

  const triggerColorBomb = (color: string, workingGrid: string[][]) => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (workingGrid[r][c] === color) workingGrid[r][c] = '';
      }
    }
  };

  // --- PROCESSUS DE CASCADE ---
  const processMatches = useCallback(async (currentGrid: string[][], isInitial = false) => {
    setIsProcessing(true);
    let workingGrid = currentGrid.map(row => [...row]);
    let firstPass = true;

    while (true) {
      const { horizontal, vertical } = checkMatches(workingGrid);
      const allMatchTiles = [...horizontal.flat(), ...vertical.flat()];
      
      if (allMatchTiles.length === 0) break;

      // Création des spéciaux (uniquement sur action joueur, pas en cascade initiale ou auto)
      if (!isInitial && firstPass) {
        horizontal.forEach(match => {
          if (match.length === 4) workingGrid[match[1].r][match[1].c] = SPECIALS.EXPLOSION;
          else if (match.length >= 5) workingGrid[match[2].r][match[2].c] = SPECIALS.COLOR_BOMB;
        });
        vertical.forEach(match => {
          if (match.length === 4) workingGrid[match[1].r][match[1].c] = SPECIALS.EXPLOSION;
          else if (match.length >= 5) workingGrid[match[2].r][match[2].c] = SPECIALS.COLOR_BOMB;
        });
      }

      // Supprimer les matches normaux (en gardant les nouveaux spéciaux)
      allMatchTiles.forEach(m => {
        if (!Object.values(SPECIALS).includes(workingGrid[m.r][m.c])) {
          workingGrid[m.r][m.c] = '';
        }
      });
      
      if (!isInitial) {
        setGrid([...workingGrid.map(row => [...row])]);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Faire tomber
      for (let c = 0; c < GRID_SIZE; c++) {
        let emptySpot = GRID_SIZE - 1;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          if (workingGrid[r][c] !== '') {
            workingGrid[emptySpot][c] = workingGrid[r][c];
            if (emptySpot !== r) workingGrid[r][c] = '';
            emptySpot--;
          }
        }
        for (let r = emptySpot; r >= 0; r--) {
          workingGrid[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
      }
      
      if (!isInitial) {
        const points = Math.floor(allMatchTiles.length * 10 * powerUps.streakMultiplier * (powerUps.scoreDouble ? 2 : 1));
        setScore(prev => prev + points);
        setGrid([...workingGrid.map(row => [...row])]);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      firstPass = false;
    }

    if (isInitial) setGrid(workingGrid);
    setIsProcessing(false);
  }, [checkMatches, powerUps]);

  // --- INITIALISATION ---
  const initGame = useCallback(async () => {
    const initialGrid = Array.from({ length: GRID_SIZE }, () => 
      Array.from({ length: GRID_SIZE }, () => COLORS[Math.floor(Math.random() * COLORS.length)])
    );
    await processMatches(initialGrid, true);
    setScore(0);
    setMoves(20);
    setGameOver(false);
    setIsNewBest(false);
    setTimeFrozen(false);
    setShieldActive(powerUps.shield);
  }, [processMatches, powerUps]);

  useEffect(() => { if (studentStats.average > 0) initGame(); }, [initGame, studentStats.average]);

  // --- ACTIONS ---
  const handleTileClick = async (r: number, c: number) => {
    if (isProcessing || gameOver) return;

    if (!selectedTile) {
      // Si on clique sur une Color Bomb directement (ou autre spécial)? 
      // Pour l'instant on attend un swap
      setSelectedTile({ r, c });
    } else {
      const distance = Math.abs(selectedTile.r - r) + Math.abs(selectedTile.c - c);
      if (distance === 1) {
        let newGrid = grid.map(row => [...row]);
        const tileA = newGrid[selectedTile.r][selectedTile.c];
        const tileB = newGrid[r][c];

        // Effet Color Bomb
        if (tileA === SPECIALS.COLOR_BOMB || tileB === SPECIALS.COLOR_BOMB) {
          setMoves(prev => prev - 1);
          const targetColor = tileA === SPECIALS.COLOR_BOMB ? tileB : tileA;
          triggerColorBomb(targetColor, newGrid);
          newGrid[selectedTile.r][selectedTile.c] = '';
          newGrid[r][c] = '';
          setSelectedTile(null);
          await processMatches(newGrid);
          return;
        }

        // Swap standard
        newGrid[r][c] = tileA;
        newGrid[selectedTile.r][selectedTile.c] = tileB;
        
        const { horizontal, vertical } = checkMatches(newGrid);
        const hasSpecialMatch = tileA === SPECIALS.EXPLOSION || tileB === SPECIALS.EXPLOSION;

        if (horizontal.length > 0 || vertical.length > 0 || hasSpecialMatch) {
          setMoves(prev => prev - 1);
          if (tileA === SPECIALS.EXPLOSION) triggerExplosion(r, c, newGrid);
          if (tileB === SPECIALS.EXPLOSION) triggerExplosion(selectedTile.r, selectedTile.c, newGrid);
          
          setSelectedTile(null);
          await processMatches(newGrid);
          if (moves <= 1) handleGameOver(score);
        } else {
          // Si le bouclier est actif, on peut autoriser un coup "dans le vide" une fois ?
          // L'utilisateur demande un bouclier, on va dire qu'il empêche de perdre un coup si pas de match
          if (shieldActive) {
            setShieldActive(false);
            // On laisse le swap mais on ne baisse pas les moves? 
            // Ou on annule le swap sans perdre de coup.
            setSelectedTile(null);
          } else {
            setSelectedTile({ r, c });
          }
        }
      } else {
        setSelectedTile({ r, c });
      }
    }
  };

  const handleGameOver = async (finalScore: number) => {
    setGameOver(true);
    if (session?.user?.id) {
      if (finalScore > personalBest) {
        setIsNewBest(true);
        setPersonalBest(finalScore);
      }
      await saveGameScore(session.user.id, 'sakura-mix', finalScore);
      fetchLeaderboard();
    }
  };

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const scopeClassId = lbScope === 'class' ? (studentStats.classId ?? undefined) : undefined;
      const data = await getLeaderboard('sakura-mix', scopeClassId);
      setLeaderboard(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [lbScope, studentStats.classId]);

  useEffect(() => { if (showLeaderboard) fetchLeaderboard(); }, [showLeaderboard, fetchLeaderboard]);

  const useTimeFreeze = () => {
    if (powerUps.timeFreeze && !timeFrozen) {
      setTimeFrozen(true);
      setMoves(prev => prev + 5); // Bonus de coups au lieu de figer le temps réel
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 font-sans overflow-hidden">
      {/* HUD - Power-Ups */}
      <div className="w-full max-w-md flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
        {powerUps.scoreDouble && <span className="shrink-0 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">x2 Score</span>}
        {powerUps.shield && <span className={`shrink-0 border px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${shieldActive ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>Bouclier {shieldActive ? 'OK' : 'Off'}</span>}
        {powerUps.timeFreeze && (
          <button 
            onClick={useTimeFreeze}
            disabled={timeFrozen}
            className={`shrink-0 border px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${!timeFrozen ? 'bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/40' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
          >
            {timeFrozen ? 'Temps Utilisé' : 'Figer Temps'}
          </button>
        )}
        <span className="shrink-0 bg-orange-600/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Série x{powerUps.streakMultiplier.toFixed(1)}</span>
      </div>

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div className="text-center">
          <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-0.5">Cosmétologie</div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Sakura Mix</h1>
        </div>
        <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700 text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-6.75c-.622 0-1.125.504-1.125 1.125v3.375m9 0h-9M9 10.125h6M9 6h6m-7.5.375a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0z" /></svg>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Score</div>
          <div className="text-3xl font-black tabular-nums">{score}</div>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Coups</div>
          <div className={`text-3xl font-black tabular-nums ${moves <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{moves}</div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative bg-slate-800 p-3 rounded-[2.5rem] border-8 border-slate-700 shadow-2xl">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, width: 'min(90vw, 360px)', height: 'min(90vw, 360px)' }}>
          {grid.map((row, r) => row.map((tile, c) => (
            <button key={`${r}-${c}`} onClick={() => handleTileClick(r, c)} className={`flex items-center justify-center text-2xl sm:text-3xl rounded-xl transition-all duration-300 ${selectedTile?.r === r && selectedTile?.c === c ? 'bg-white/20 scale-110 ring-4 ring-white/50 z-10 shadow-lg shadow-white/10' : 'bg-slate-700/30 hover:bg-slate-600/50'} ${tile === '' ? 'opacity-0 scale-50' : 'opacity-100'} ${isProcessing ? 'cursor-default' : 'cursor-pointer active:scale-90'}`}>
              {tile}
            </button>
          )))}
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 rounded-[1.8rem] backdrop-blur-md p-6 text-center animate-in fade-in zoom-in">
            {isNewBest && <div className="mb-2 bg-amber-500 text-slate-900 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest animate-bounce">Nouveau Record Personnel !</div>}
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-white">Terminé</h2>
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700"><div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Score</div><div className="text-2xl font-black">{score}</div></div>
              <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700"><div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Record</div><div className="text-2xl font-black text-amber-400">{personalBest}</div></div>
            </div>

            {/* Mini LB */}
            <div className="w-full mb-6 space-y-1">
               {leaderboard.slice(0, 3).map((s, i) => (
                 <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-white/5 rounded-lg border border-white/5">
                    <span className="font-bold text-slate-400">#{i+1} {s.userName}</span>
                    <span className="font-black text-white">{s.score}</span>
                 </div>
               ))}
            </div>

            <button onClick={initGame} className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg active:scale-95 mb-3">Rejouer</button>
            <Link href="/student/games" className="w-full py-4 bg-slate-800 text-white text-center font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition border border-slate-700">Quitter</Link>
          </div>
        )}
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}></div>
          <div className="relative bg-slate-800 w-full max-w-sm rounded-[2rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in">
             <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black uppercase tracking-tight text-amber-400">{lbScope === 'class' ? 'Top du Dojo' : 'Top de l\'Empire'}</h3>
                  <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-white transition"><X className="h-6 w-6" /></button>
                </div>
                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
                  <button onClick={() => setLbScope('class')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${lbScope === 'class' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Dojo (Classe)</button>
                  <button onClick={() => setLbScope('school')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${lbScope === 'school' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Empire (École)</button>
                </div>
             </div>
             <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                {loadingLeaderboard ? <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Chargement...</div> : (
                  <div className="space-y-2">
                    {leaderboard.map((s, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${s.userName.includes(session?.user?.name || '---') ? 'bg-red-600/20 border-red-500/50' : 'bg-slate-700/50 border-slate-600'}`}>
                        <div className="flex items-center gap-3"><span className={`text-xs font-black ${i < 3 ? 'text-amber-400' : 'text-slate-500'}`}>#{i+1}</span><div><p className="text-xs font-bold text-white uppercase">{s.userName}</p><p className="text-[9px] text-slate-400 uppercase font-medium">{s.className}</p></div></div>
                        <span className="text-sm font-black text-white tabular-nums">{s.score}</span>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
