"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { saveGameScore } from '@/app/actions/gamification';

const GRID_SIZE = 8;
const COLORS = ['🌸', '🍶', '🏮', '🍱', '⛩️', '🎐'];
const TILE_SIZE = 40;

export default function SakuraMix() {
  const { data: session } = useSession();
  const [grid, setGrid] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [selectedTile, setSelectedTile] = useState<{ r: number, c: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Initialisation de la grille
  const createGrid = useCallback(() => {
    const newGrid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  }, []);

  useEffect(() => {
    createGrid();
  }, [createGrid]);

  // Logique de matching
  const checkMatches = useCallback((currentGrid: string[][]) => {
    const matches: { r: number, c: number }[] = [];
    
    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        if (currentGrid[r][c] && currentGrid[r][c] === currentGrid[r][c+1] && currentGrid[r][c] === currentGrid[r][c+2]) {
          matches.push({r, c}, {r, c: c+1}, {r, c: c+2});
        }
      }
    }
    
    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        if (currentGrid[r][c] && currentGrid[r][c] === currentGrid[r+1][c] && currentGrid[r][c] === currentGrid[r+2][c]) {
          matches.push({r, c}, {r: r+1, c}, {r: r+2, c});
        }
      }
    }
    
    return Array.from(new Set(matches.map(m => `${m.r},${m.c}`))).map(s => {
      const [r, c] = s.split(',').map(Number);
      return {r, c};
    });
  }, []);

  const handleTileClick = async (r: number, c: number) => {
    if (isProcessing || gameOver) return;

    if (!selectedTile) {
      setSelectedTile({ r, c });
    } else {
      const distance = Math.abs(selectedTile.r - r) + Math.abs(selectedTile.c - c);
      
      if (distance === 1) {
        // Swap
        const newGrid = grid.map(row => [...row]);
        const temp = newGrid[r][c];
        newGrid[r][c] = newGrid[selectedTile.r][selectedTile.c];
        newGrid[selectedTile.r][selectedTile.c] = temp;
        
        const matches = checkMatches(newGrid);
        if (matches.length > 0) {
          setMoves(prev => prev - 1);
          processMatches(newGrid);
        } else {
          // Annuler le swap si pas de match (optionnel pour la difficulté)
          setSelectedTile(null);
        }
      } else {
        setSelectedTile({ r, c });
      }
    }
  };

  const processMatches = async (currentGrid: string[][]) => {
    setIsProcessing(true);
    let workingGrid = [...currentGrid.map(row => [...row])];
    let totalMatchesFound = 0;

    while (true) {
      const matches = checkMatches(workingGrid);
      if (matches.length === 0) break;

      totalMatchesFound += matches.length;
      
      // Supprimer les matches
      matches.forEach(m => {
        workingGrid[m.r][m.c] = '';
      });
      
      setGrid([...workingGrid]);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Faire tomber les tuiles
      for (let c = 0; c < GRID_SIZE; c++) {
        let emptySpot = GRID_SIZE - 1;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          if (workingGrid[r][c] !== '') {
            workingGrid[emptySpot][c] = workingGrid[r][c];
            if (emptySpot !== r) workingGrid[r][c] = '';
            emptySpot--;
          }
        }
        // Remplir le haut
        for (let r = emptySpot; r >= 0; r--) {
          workingGrid[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
      }
      
      setGrid([...workingGrid]);
      setScore(prev => prev + matches.length * 10);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsProcessing(false);
    setSelectedTile(null);

    if (moves <= 1) {
      setGameOver(true);
      if (session?.user?.id) {
        await saveGameScore(session.user.id, 'sakura-mix', score + totalMatchesFound * 10);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 font-sans">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <Link href="/student/games" className="text-slate-400 hover:text-white transition">&larr; Retour</Link>
        <div className="text-center">
          <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Cosmétologie</div>
          <h1 className="text-xl font-black uppercase tracking-tight">Sakura Mix</h1>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-md">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Score</div>
          <div className="text-2xl font-black tabular-nums">{score}</div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Coups restants</div>
          <div className={`text-2xl font-black tabular-nums ${moves <= 5 ? 'text-red-500' : 'text-white'}`}>{moves}</div>
        </div>
      </div>

      <div className="relative bg-slate-800 p-2 rounded-3xl border-4 border-slate-700 shadow-2xl">
        <div 
          className="grid gap-1"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            width: 'min(90vw, 340px)',
            height: 'min(90vw, 340px)'
          }}
        >
          {grid.map((row, r) => (
            row.map((tile, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleTileClick(r, c)}
                className={`
                  flex items-center justify-center text-2xl rounded-lg transition-all duration-200
                  ${selectedTile?.r === r && selectedTile?.c === c ? 'bg-white/20 scale-110 ring-2 ring-white' : 'bg-slate-700/50 hover:bg-slate-700'}
                  ${tile === '' ? 'opacity-0 scale-50' : 'opacity-100'}
                `}
              >
                {tile}
              </button>
            ))
          ))}
        </div>

        {gameOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 rounded-2xl backdrop-blur-sm animate-in fade-in zoom-in duration-300">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Partie terminée</h2>
            <p className="text-slate-400 mb-6 font-medium text-center">Votre score final : <span className="text-white font-bold">{score}</span></p>
            <div className="flex flex-col gap-3 w-48">
              <button 
                onClick={() => { setScore(0); setMoves(20); setGameOver(false); createGrid(); }}
                className="w-full py-3 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition"
              >
                Rejouer
              </button>
              <Link 
                href="/student/games"
                className="w-full py-3 bg-slate-800 text-white text-center font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition"
              >
                Quitter
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 max-w-md text-center">
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl">
          <p className="text-xs text-slate-400 leading-relaxed italic">
            "Maître, alignez 3 pigments identiques pour créer les nuances parfaites pour vos clientes."
          </p>
        </div>
      </div>
    </div>
  );
}
