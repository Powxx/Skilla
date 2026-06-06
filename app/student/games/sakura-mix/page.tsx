"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore, getLeaderboard, getPersonalBest, getStudentStats } from '@/app/actions/gamification';
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

  // Modals state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lbScope, setLbScope] = useState<'class' | 'school'>('class');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdvantages, setShowAdvantages] = useState(false);
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
        // On ne matche que les couleurs standard entre elles
        if (tile && COLORS.includes(tile)) {
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
        if (tile && COLORS.includes(tile)) {
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

  // --- SPECIAL EFFECTS ---
  const triggerExplosion = (r: number, c: number, workingGrid: string[][]) => {
    const tilesExploded = [];
    for (let i = Math.max(0, r - 1); i <= Math.min(GRID_SIZE - 1, r + 1); i++) {
      for (let j = Math.max(0, c - 1); j <= Math.min(GRID_SIZE - 1, c + 1); j++) {
        if (workingGrid[i][j] !== '') {
          tilesExploded.push({r: i, c: j});
          workingGrid[i][j] = '';
        }
      }
    }
    return tilesExploded.length;
  };

  const triggerColorBomb = (targetColor: string, workingGrid: string[][]) => {
    let count = 0;
    // Si on swap avec un autre spécial, on nettoie tout ? Pour l'instant on nettoie la couleur target
    // Si target est un spécial, on choisit une couleur aléatoire
    const realTarget = COLORS.includes(targetColor) ? targetColor : COLORS[Math.floor(Math.random() * COLORS.length)];
    
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (workingGrid[r][c] === realTarget) {
          workingGrid[r][c] = '';
          count++;
        }
      }
    }
    return count;
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

      // Création des spéciaux
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

      // Supprimer les matches normaux
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

  useEffect(() => { initGame(); }, [initGame]);

  // --- ACTIONS ---
  const handleTileClick = async (r: number, c: number) => {
    if (isProcessing || gameOver) return;

    if (!selectedTile) {
      setSelectedTile({ r, c });
    } else {
      const distance = Math.abs(selectedTile.r - r) + Math.abs(selectedTile.c - c);
      if (distance === 1) {
        let newGrid = grid.map(row => [...row]);
        const tileA = newGrid[selectedTile.r][selectedTile.c];
        const tileB = newGrid[r][c];

        let specialTriggered = false;

        // --- NOUVELLE LOGIQUE : SWAP AVEC SPÉCIAUX ---
        
        // 1. Color Bomb (swapper avec n'importe quoi active l'effet)
        if (tileA === SPECIALS.COLOR_BOMB || tileB === SPECIALS.COLOR_BOMB) {
          const targetColor = tileA === SPECIALS.COLOR_BOMB ? tileB : tileA;
          const explodedCount = triggerColorBomb(targetColor, newGrid);
          newGrid[selectedTile.r][selectedTile.c] = '';
          newGrid[r][c] = '';
          setScore(prev => prev + explodedCount * 20);
          specialTriggered = true;
        } 
        // 2. Explosion (swapper avec n'importe quoi active l'effet)
        else if (tileA === SPECIALS.EXPLOSION || tileB === SPECIALS.EXPLOSION) {
          if (tileA === SPECIALS.EXPLOSION) triggerExplosion(r, c, newGrid);
          if (tileB === SPECIALS.EXPLOSION) triggerExplosion(selectedTile.r, selectedTile.c, newGrid);
          specialTriggered = true;
        }

        if (specialTriggered) {
          setMoves(prev => prev - 1);
          setSelectedTile(null);
          await processMatches(newGrid);
          if (moves <= 1) handleGameOver(score);
          return;
        }

        // --- SWAP STANDARD ---
        newGrid[r][c] = tileA;
        newGrid[selectedTile.r][selectedTile.c] = tileB;
        
        const { horizontal, vertical } = checkMatches(newGrid);

        if (horizontal.length > 0 || vertical.length > 0) {
          setMoves(prev => prev - 1);
          setSelectedTile(null);
          await processMatches(newGrid);
          if (moves <= 1) handleGameOver(score);
        } else {
          if (shieldActive) {
            setShieldActive(false);
            setSelectedTile(null);
            // On laisse le swap mais pas de match : le bouclier a servi à ne pas perdre de tour
          } else {
            // Pas de match et pas de bouclier : on annule ou on laisse? 
            // Généralement on annule le swap dans un match-3
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
      setMoves(prev => prev + 5);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 font-sans overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <Link href="/student/games" className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div className="text-center">
          <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-0.5">Cosmétologie</div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Sakura Mix</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdvantages(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700 text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
          </button>
          <button onClick={() => setShowLeaderboard(true)} className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-6.75c-.622 0-1.125.504-1.125 1.125v3.375m9 0h-9M9 10.125h6M9 6h6m-7.5.375a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0z" /></svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-xl overflow-hidden relative">
           {powerUps.scoreDouble && <div className="absolute top-0 right-0 bg-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase">x2</div>}
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">Score</div>
          <div className="text-3xl font-black tabular-nums text-center">{score}</div>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-xl overflow-hidden relative">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">Coups</div>
          <div className={`text-3xl font-black tabular-nums text-center ${moves <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{moves}</div>
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
            {isNewBest && <div className="mb-2 bg-amber-500 text-slate-900 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest animate-bounce">Nouveau Record !</div>}
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-white">Terminé</h2>
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700"><div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Score</div><div className="text-2xl font-black">{score}</div></div>
              <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700"><div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Record</div><div className="text-2xl font-black text-amber-400">{personalBest}</div></div>
            </div>
            <button onClick={initGame} className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg active:scale-95 mb-3">Rejouer</button>
            <Link href="/student/games" className="w-full py-4 bg-slate-800 text-white text-center font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition border border-slate-700">Quitter</Link>
          </div>
        )}
      </div>

      {/* Advantages Modal */}
      {showAdvantages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAdvantages(false)}></div>
           <div className="relative bg-slate-800 w-full max-w-sm rounded-[2rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                 <h3 className="text-xl font-black uppercase tracking-tight text-blue-400">Avantages Actifs</h3>
                 <button onClick={() => setShowAdvantages(false)} className="text-slate-400 hover:text-white transition"><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex items-center justify-between p-4 bg-orange-600/10 rounded-2xl border border-orange-500/20">
                    <div>
                       <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Assiduité</p>
                       <p className="text-lg font-black text-white">Multiplicateur x{powerUps.streakMultiplier.toFixed(1)}</p>
                    </div>
                    <span className="text-2xl">🔥</span>
                 </div>

                 <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${powerUps.scoreDouble ? 'bg-emerald-600/10 border-emerald-500/20' : 'bg-slate-900/50 border-slate-700 opacity-40'}`}>
                    <div>
                       <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Moyenne &gt; 10</p>
                       <p className="text-sm font-bold text-white">Score Double (x2)</p>
                    </div>
                    <span className="text-xl">💎</span>
                 </div>

                 <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${powerUps.shield ? 'bg-blue-600/10 border-blue-500/20' : 'bg-slate-900/50 border-slate-700 opacity-40'}`}>
                    <div>
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Moyenne &gt; 13</p>
                       <p className="text-sm font-bold text-white">Bouclier d'Or</p>
                       <p className="text-[9px] text-slate-400">Protège 1 coup manqué</p>
                    </div>
                    <span className="text-xl">🛡️</span>
                 </div>

                 <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${powerUps.timeFreeze ? 'bg-amber-600/10 border-amber-500/20' : 'bg-slate-900/50 border-slate-700 opacity-40'}`}>
                    <div>
                       <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Moyenne &gt; 16</p>
                       <p className="text-sm font-bold text-white">Figer Temps</p>
                       <p className="text-[9px] text-slate-400">Gain de +5 coups</p>
                    </div>
                    <button 
                      onClick={() => { useTimeFreeze(); setShowAdvantages(false); }} 
                      disabled={!powerUps.timeFreeze || timeFrozen}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${!timeFrozen && powerUps.timeFreeze ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                    >
                      {timeFrozen ? 'Utilisé' : 'Activer'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

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
