'use client'

import { useState, useEffect } from 'react'
import { Game, createEmptyGame, shuffleNumbers, getWinner, getPlayerColor, Winner } from './types'
import { database, ref, set, onValue } from './firebase'

const GAME_REF = 'game'

export default function Home() {
  const [game, setGame] = useState<Game | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [winners, setWinners] = useState<Winner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  // Load game from Firebase and listen for real-time updates
  useEffect(() => {
    const gameRef = ref(database, GAME_REF)
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        // Firebase converts arrays to objects, so we need to convert them back
        const gameData = data as Record<string, unknown>
        
        // Convert grid back to 2D array
        let grid: (string | null)[][] = Array(10).fill(null).map(() => Array(10).fill(null))
        if (gameData.grid) {
          const gridData = gameData.grid as Record<string, Record<string, string | null>>
          for (let r = 0; r < 10; r++) {
            if (gridData[r]) {
              for (let c = 0; c < 10; c++) {
                grid[r][c] = gridData[r][c] ?? null
              }
            }
          }
        }
        
        // Convert rowNumbers and colNumbers back to arrays
        const rowNumbers = gameData.rowNumbers 
          ? Object.values(gameData.rowNumbers as Record<string, number>)
          : null
        const colNumbers = gameData.colNumbers
          ? Object.values(gameData.colNumbers as Record<string, number>)
          : null
        
        // Ensure scores object exists with proper structure
        const scores = (gameData.scores as Game['scores']) || {}
        
        setGame({
          teamA: (gameData.teamA as string) || 'Team A',
          teamB: (gameData.teamB as string) || 'Team B',
          costPerSquare: (gameData.costPerSquare as number) || 10,
          isLocked: (gameData.isLocked as boolean) || false,
          grid,
          rowNumbers,
          colNumbers,
          scores: {
            q1: scores.q1 || { teamA: 0, teamB: 0 },
            q2: scores.q2 || { teamA: 0, teamB: 0 },
            q3: scores.q3 || { teamA: 0, teamB: 0 },
            final: scores.final || { teamA: 0, teamB: 0 },
          },
          payouts: (gameData.payouts as Game['payouts']) || { q1: 20, q2: 20, q3: 20, final: 40 },
        } as Game)
      } else {
        // No game exists, create one
        const newGame = createEmptyGame()
        set(gameRef, newGame)
        setGame(newGame)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Calculate winners when game changes
  useEffect(() => {
    if (game && game.scores && game.grid) {
      const w: Winner[] = []
      for (const q of ['q1', 'q2', 'q3', 'final'] as const) {
        if (game.scores[q]) {
          const winner = getWinner(game, q)
          if (winner) w.push(winner)
        }
      }
      setWinners(w)
    }
  }, [game])

  // Helper to save game to Firebase
  const saveGame = (newGame: Game) => {
    const gameRef = ref(database, GAME_REF)
    set(gameRef, newGame)
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white text-xl">Loading game... 🏈</div>
  if (!game || !game.grid) return <div className="p-8 text-white">Loading...</div>

  const allNames = (game.grid?.flat?.() || []).filter(Boolean) as string[]
  const claimedCount = allNames.length
  const totalPot = claimedCount * game.costPerSquare

  // Calculate player stats (name -> count)
  const playerStats = allNames.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const sortedPlayers = Object.entries(playerStats).sort((a, b) => b[1] - a[1])

  function claimSquare() {
    if (!game || !selectedCell || !playerName.trim() || game.isLocked) return
    const newGrid = game.grid.map((row) => [...row])
    newGrid[selectedCell.row][selectedCell.col] = playerName.trim()
    const newGame = { ...game, grid: newGrid }
    saveGame(newGame)
    setSelectedCell(null)
  }

  function lockAndAssignNumbers() {
    if (!game) return
    const newGame = {
      ...game,
      isLocked: true,
      rowNumbers: shuffleNumbers(),
      colNumbers: shuffleNumbers()
    }
    saveGame(newGame)
  }

  function fillMockData() {
    if (!game || game.isLocked) return
    const mockNames = ['Mike', 'Sarah', 'Dave', 'Lisa', 'Tom', 'Emma', 'Jake', 'Amy', 'Chris', 'Megan', 'Brian', 'Katie']
    const newGrid = game.grid.map((row) => [...row])
    
    // Assign 3-8 squares to each person
    const assignments: { name: string; count: number }[] = mockNames.map((name) => ({
      name,
      count: Math.floor(Math.random() * 6) + 3 // 3-8 squares each
    }))
    
    // Get all empty cell positions and shuffle them
    const emptyCells: { row: number; col: number }[] = []
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!newGrid[r][c]) emptyCells.push({ row: r, col: c })
      }
    }
    // Shuffle empty cells
    for (let i = emptyCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]]
    }
    
    // Fill cells with mock names
    let cellIndex = 0
    for (const { name, count } of assignments) {
      for (let i = 0; i < count && cellIndex < emptyCells.length; i++) {
        const { row, col } = emptyCells[cellIndex++]
        newGrid[row][col] = name
      }
    }
    
    saveGame({ ...game, grid: newGrid })
  }

  function updateScore(quarter: 'q1' | 'q2' | 'q3' | 'final', team: 'teamA' | 'teamB', value: number) {
    if (!game) return
    const current = game.scores[quarter] || { teamA: 0, teamB: 0 }
    saveGame({
      ...game,
      scores: {
        ...game.scores,
        [quarter]: { ...current, [team]: value }
      }
    })
  }

  function updateTeam(field: 'teamA' | 'teamB', value: string) {
    if (!game) return
    saveGame({ ...game, [field]: value })
  }

  function resetGame() {
    if (typeof window !== 'undefined' && confirm('Are you sure? This will delete all data.')) {
      saveGame(createEmptyGame())
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
        <p className="text-green-400 text-xs mt-1">🟢 Live synced across all devices</p>
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

      {/* Grid + Scoreboard */}
      <div className="flex justify-center gap-4 md:gap-6 mb-6">
        {/* Player Scoreboard */}
        <div className="hidden md:block bg-slate-800/50 rounded-xl p-4 min-w-[160px] max-h-[500px] overflow-y-auto">
          <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wide">Players</h3>
          {sortedPlayers.length === 0 ? (
            <p className="text-purple-400 text-sm">No players yet</p>
          ) : (
            <div className="space-y-2">
              {sortedPlayers.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setSelectedPlayer(name)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:ring-2 hover:ring-white/50 transition-all cursor-pointer"
                  style={{ backgroundColor: getPlayerColor(name, allNames) }}
                >
                  <span className="text-white text-sm font-medium truncate max-w-[100px]">{name}</span>
                  <span className="text-white/80 text-sm font-bold">{count}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-slate-600">
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Total</span>
              <span className="text-white font-bold">{claimedCount}/100</span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block">
          {/* Column numbers (Team B) */}
          <div className="flex">
            <div className="w-12 md:w-28 h-6 md:h-10"></div>
            <div className="flex-1 text-center text-white font-bold text-xs md:text-lg mb-1">
              {game.teamB} →
            </div>
          </div>
          <div className="flex">
            <div className="w-12 md:w-28"></div>
            {(game.colNumbers || Array(10).fill('?')).map((num, i) => (
              <div key={i} className="w-[32px] md:w-12 h-5 md:h-8 flex items-center justify-center text-white font-bold text-[10px] md:text-base bg-purple-800/50 border-b border-purple-600">
                {num}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="flex">
            {/* Row numbers (Team A) */}
            <div className="flex flex-col">
              <div className="w-8 md:w-20 flex items-center justify-center">
                <span className="text-white font-bold text-[10px] md:text-lg transform -rotate-90 whitespace-nowrap">
                  ← {game.teamA}
                </span>
              </div>
            </div>
            <div className="flex">
              <div className="flex flex-col">
                {(game.rowNumbers || Array(10).fill('?')).map((num, i) => (
                  <div key={i} className="w-4 md:w-8 h-[32px] md:h-12 flex items-center justify-center text-white font-bold text-[10px] md:text-base bg-purple-800/50 border-r border-purple-600">
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
                            w-[32px] md:w-12 h-[32px] md:h-12 border border-purple-600/50 text-[8px] md:text-xs font-medium
                            transition-all duration-150 relative
                            ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-purple-900' : ''}
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

      {/* Player Squares Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getPlayerColor(selectedPlayer, allNames) }}
                />
                {selectedPlayer}&apos;s Squares
              </h3>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-purple-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-purple-300 text-sm mb-4">
              {playerStats[selectedPlayer] || 0} squares • ${(playerStats[selectedPlayer] || 0) * game.costPerSquare} invested
            </p>
            {/* Mini Grid */}
            <div className="flex justify-center">
              <div>
                {/* Column headers */}
                <div className="flex">
                  <div className="w-6 h-6"></div>
                  {(game.colNumbers || Array(10).fill('?')).map((num, i) => (
                    <div key={i} className="w-6 h-6 flex items-center justify-center text-[10px] text-purple-400 font-bold">
                      {num}
                    </div>
                  ))}
                </div>
                {/* Grid rows */}
                {game.grid.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex">
                    <div className="w-6 h-6 flex items-center justify-center text-[10px] text-purple-400 font-bold">
                      {(game.rowNumbers || Array(10).fill('?'))[rowIdx]}
                    </div>
                    {row.map((cell, colIdx) => {
                      const isPlayerSquare = cell === selectedPlayer
                      const isWinner = winners.some((w) => w.row === rowIdx && w.col === colIdx && w.name === selectedPlayer)
                      return (
                        <div
                          key={colIdx}
                          className={`
                            w-6 h-6 border border-slate-600/50 flex items-center justify-center text-[8px]
                            ${isPlayerSquare ? 'text-white font-bold' : 'text-slate-600'}
                            ${isWinner ? 'ring-1 ring-yellow-400' : ''}
                          `}
                          style={{ 
                            backgroundColor: isPlayerSquare 
                              ? getPlayerColor(selectedPlayer, allNames) 
                              : 'transparent' 
                          }}
                        >
                          {isPlayerSquare ? '✓' : ''}
                          {isWinner && <span className="absolute text-[8px]">🏆</span>}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            {/* List their coordinates */}
            <div className="mt-4 pt-4 border-t border-slate-600">
              <p className="text-purple-400 text-xs mb-2">Square coordinates:</p>
              <div className="flex flex-wrap gap-1">
                {game.grid.flatMap((row, r) => 
                  row.map((cell, c) => cell === selectedPlayer ? (
                    <span key={`${r}-${c}`} className="text-xs bg-slate-700 px-2 py-1 rounded text-white">
                      ({(game.rowNumbers || [])[r] ?? '?'}, {(game.colNumbers || [])[c] ?? '?'})
                    </span>
                  ) : null)
                ).filter(Boolean)}
              </div>
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

      {/* Mobile Player Scoreboard */}
      {sortedPlayers.length > 0 && (
        <div className="md:hidden bg-slate-800/50 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wide">Players</h3>
          <div className="flex flex-wrap gap-2">
            {sortedPlayers.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setSelectedPlayer(name)}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:ring-2 hover:ring-white/50 transition-all cursor-pointer"
                style={{ backgroundColor: getPlayerColor(name, allNames) }}
              >
                <span className="text-white text-sm font-medium">{name}</span>
                <span className="text-white/80 text-xs font-bold bg-black/20 px-1.5 py-0.5 rounded">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Admin Panel Toggle */}
      <div className="text-center mb-4">
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className="text-purple-400 hover:text-purple-300 text-sm"
        >
          {showAdmin ? '▲ Hide Admin' : '▼ Show Admin Panel'}
        </button>
      </div>

      {/* Admin Password Prompt */}
      {showAdmin && !isAdminUnlocked && (
        <div className="bg-slate-800/50 rounded-xl p-6 max-w-sm mx-auto mb-6">
          <h3 className="text-lg font-bold text-white mb-4">🔐 Admin Access</h3>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white border border-slate-600 mb-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (adminPassword === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
                  setIsAdminUnlocked(true)
                } else {
                  alert('Incorrect password')
                  setAdminPassword('')
                }
              }
            }}
          />
          <button
            onClick={() => {
              if (adminPassword === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
                setIsAdminUnlocked(true)
              } else {
                alert('Incorrect password')
                setAdminPassword('')
              }
            }}
            className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium"
          >
            Unlock
          </button>
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && isAdminUnlocked && (
        <div className="bg-slate-800/50 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>

          {/* Team Setup */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-purple-400 text-sm">Team A (Rows)</label>
              <input
                type="text"
                value={game.teamA}
                onChange={(e) => updateTeam('teamA', e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-700 text-white border border-slate-600"
                disabled={game.isLocked}
              />
            </div>
            <div>
              <label className="text-purple-400 text-sm">Team B (Columns)</label>
              <input
                type="text"
                value={game.teamB}
                onChange={(e) => updateTeam('teamB', e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-700 text-white border border-slate-600"
                disabled={game.isLocked}
              />
            </div>
          </div>

          {/* Mock Data Button */}
          {!game.isLocked && (
            <button
              onClick={fillMockData}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              🧪 Fill with Mock Data (10-12 players)
            </button>
          )}

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
