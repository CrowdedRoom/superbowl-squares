'use client'

import { useState, useEffect } from 'react'
import { Game, createEmptyGame, shuffleNumbers, getWinner, getPlayerColor, Winner } from './types'

const STORAGE_KEY = 'superbowl-squares-game'

export default function Home() {
  const [game, setGame] = useState<Game | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [winners, setWinners] = useState<Winner[]>([])

  // Load game from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setGame(JSON.parse(saved))
    } else {
      setGame(createEmptyGame())
    }
  }, [])

  // Save game to localStorage
  useEffect(() => {
    if (game) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
      // Calculate winners
      const w: Winner[] = []
      for (const q of ['q1', 'q2', 'q3', 'final'] as const) {
        const winner = getWinner(game, q)
        if (winner) w.push(winner)
      }
      setWinners(w)
    }
  }, [game])

  if (!game) return <div className="p-8 text-white">Loading...</div>

  const allNames = game.grid.flat().filter(Boolean) as string[]
  const claimedCount = allNames.length
  const totalPot = claimedCount * game.costPerSquare

  function claimSquare() {
    if (!game || !selectedCell || !playerName.trim() || game.isLocked) return
    const newGrid = game.grid.map((row) => [...row])
    newGrid[selectedCell.row][selectedCell.col] = playerName.trim()
    setGame({ ...game, grid: newGrid })
    setSelectedCell(null)
  }

  function lockAndAssignNumbers() {
    if (!game) return
    setGame({
      ...game,
      isLocked: true,
      rowNumbers: shuffleNumbers(),
      colNumbers: shuffleNumbers()
    })
  }

  function updateScore(quarter: 'q1' | 'q2' | 'q3' | 'final', team: 'teamA' | 'teamB', value: number) {
    if (!game) return
    const current = game.scores[quarter] || { teamA: 0, teamB: 0 }
    setGame({
      ...game,
      scores: {
        ...game.scores,
        [quarter]: { ...current, [team]: value }
      }
    })
  }

  function resetGame() {
    if (typeof window !== 'undefined' && confirm('Are you sure? This will delete all data.')) {
      localStorage.removeItem(STORAGE_KEY)
      setGame(createEmptyGame())
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">🏈 Super Bowl Squares</h1>
        <p className="text-purple-300">
          {game.teamA} vs {game.teamB} • ${game.costPerSquare}/square • Pot: ${totalPot}
        </p>
      </div>

      {/* Winners Banner */}
      {winners.length > 0 && (
        <div className="mb-6 bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
          <h2 className="text-yellow-400 font-bold mb-2">🏆 Winners</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {winners.map((w) => (
              <div key={w.quarter} className="bg-yellow-500/30 rounded p-2 text-center">
                <p className="text-xs text-yellow-300 uppercase">{w.quarter === 'final' ? 'Final' : w.quarter.toUpperCase()}</p>
                <p className="text-white font-bold">{w.name}</p>
                <p className="text-yellow-400">${w.payout}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto mb-6">
        <div className="inline-block">
          {/* Column numbers (Team B) */}
          <div className="flex">
            <div className="w-16 md:w-20 h-8 md:h-10"></div>
            <div className="flex-1 text-center text-white font-bold text-sm md:text-lg mb-1" style={{ width: `${10 * 48}px` }}>
              {game.teamB} →
            </div>
          </div>
          <div className="flex">
            <div className="w-16 md:w-20"></div>
            {(game.colNumbers || Array(10).fill('?')).map((num, i) => (
              <div key={i} className="w-10 md:w-12 h-6 md:h-8 flex items-center justify-center text-white font-bold text-sm md:text-base bg-purple-800/50 border-b border-purple-600">
                {num}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="flex">
            {/* Row numbers (Team A) */}
            <div className="flex flex-col">
              <div className="w-16 md:w-20 flex items-center justify-center">
                <span className="text-white font-bold text-sm md:text-lg transform -rotate-90 whitespace-nowrap">
                  ← {game.teamA}
                </span>
              </div>
            </div>
            <div className="flex">
              <div className="flex flex-col">
                {(game.rowNumbers || Array(10).fill('?')).map((num, i) => (
                  <div key={i} className="w-6 md:w-8 h-10 md:h-12 flex items-center justify-center text-white font-bold text-sm md:text-base bg-purple-800/50 border-r border-purple-600">
                    {num}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div>
                {game.grid.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex">
                    {row.map((cell, colIdx) => {
                      const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                      const isWinner = winners.some((w) => w.row === rowIdx && w.col === colIdx)
                      const bgColor = cell ? getPlayerColor(cell, allNames) : 'transparent'

                      return (
                        <button
                          key={colIdx}
                          onClick={() => !game.isLocked && !cell && setSelectedCell({ row: rowIdx, col: colIdx })}
                          disabled={game.isLocked || !!cell}
                          className={`
                            w-10 md:w-12 h-10 md:h-12 border border-purple-600/50 text-xs font-medium
                            transition-all duration-150 relative
                            ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-purple-900' : ''}
                            ${isWinner ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
                            ${!cell && !game.isLocked ? 'hover:bg-purple-700/50 cursor-pointer' : ''}
                            ${cell ? 'text-white' : 'text-purple-400'}
                          `}
                          style={{ backgroundColor: bgColor }}
                        >
                          {cell ? (
                            <span className="truncate block px-0.5">{cell.slice(0, 4)}</span>
                          ) : (
                            <span className="opacity-30">{rowIdx},{colIdx}</span>
                          )}
                          {isWinner && <span className="absolute -top-1 -right-1 text-sm">🏆</span>}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Square Modal */}
      {selectedCell && !game.isLocked && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-4">Claim Square [{selectedCell.row},{selectedCell.col}]</h3>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white border border-slate-600 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCell(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={claimSquare}
                disabled={!playerName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
              >
                Claim (${game.costPerSquare})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-purple-400 text-sm">Squares Claimed</p>
          <p className="text-2xl font-bold text-white">{claimedCount}/100</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-purple-400 text-sm">Total Pot</p>
          <p className="text-2xl font-bold text-green-400">${totalPot}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-purple-400 text-sm">Grid Status</p>
          <p className="text-2xl font-bold text-white">{game.isLocked ? '🔒 Locked' : '🔓 Open'}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-purple-400 text-sm">Players</p>
          <p className="text-2xl font-bold text-white">{new Set(allNames).size}</p>
        </div>
      </div>

      {/* Admin Panel Toggle */}
      <div className="text-center mb-4">
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className="text-purple-400 hover:text-purple-300 text-sm"
        >
          {showAdmin ? '▲ Hide Admin' : '▼ Show Admin Panel'}
        </button>
      </div>

      {/* Admin Panel */}
      {showAdmin && (
        <div className="bg-slate-800/50 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>

          {/* Team Setup */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-purple-400 text-sm">Team A (Rows)</label>
              <input
                type="text"
                value={game.teamA}
                onChange={(e) => setGame({ ...game, teamA: e.target.value })}
                className="w-full px-3 py-2 rounded bg-slate-700 text-white border border-slate-600"
                disabled={game.isLocked}
              />
            </div>
            <div>
              <label className="text-purple-400 text-sm">Team B (Columns)</label>
              <input
                type="text"
                value={game.teamB}
                onChange={(e) => setGame({ ...game, teamB: e.target.value })}
                className="w-full px-3 py-2 rounded bg-slate-700 text-white border border-slate-600"
                disabled={game.isLocked}
              />
            </div>
          </div>

          {/* Lock & Assign Numbers */}
          {!game.isLocked && (
            <button
              onClick={lockAndAssignNumbers}
              className="w-full py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold"
            >
              🔒 Lock Grid & Assign Numbers
            </button>
          )}

          {/* Score Entry */}
          {game.isLocked && (
            <div className="space-y-4">
              <h3 className="text-white font-bold">Enter Scores</h3>
              {(['q1', 'q2', 'q3', 'final'] as const).map((q) => (
                <div key={q} className="flex items-center gap-4">
                  <span className="text-purple-400 w-16 uppercase">{q === 'final' ? 'Final' : q}</span>
                  <input
                    type="number"
                    placeholder={game.teamA}
                    value={game.scores[q]?.teamA ?? ''}
                    onChange={(e) => updateScore(q, 'teamA', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded bg-slate-700 text-white text-center"
                  />
                  <span className="text-white">-</span>
                  <input
                    type="number"
                    placeholder={game.teamB}
                    value={game.scores[q]?.teamB ?? ''}
                    onChange={(e) => updateScore(q, 'teamB', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded bg-slate-700 text-white text-center"
                  />
                  {winners.find((w) => w.quarter === q) && (
                    <span className="text-yellow-400">🏆 {winners.find((w) => w.quarter === q)?.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reset */}
          <button
            onClick={resetGame}
            className="w-full py-2 rounded-lg bg-red-600/50 hover:bg-red-600 text-white text-sm"
          >
            🗑️ Reset Game
          </button>
        </div>
      )}

      <p className="text-center text-purple-400/50 text-xs mt-8">
        Super Bowl Squares • Built for game day 🏈
      </p>
    </div>
  )
}
