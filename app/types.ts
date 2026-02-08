export interface Game {
  id: string
  teamA: string
  teamB: string
  costPerSquare: number
  payouts: { q1: number; q2: number; q3: number; final: number }
  grid: (string | null)[][]
  rowNumbers: number[] | null
  colNumbers: number[] | null
  scores: {
    q1: { teamA: number; teamB: number } | null
    q2: { teamA: number; teamB: number } | null
    q3: { teamA: number; teamB: number } | null
    final: { teamA: number; teamB: number } | null
  }
  isLocked: boolean
  createdAt: string
}

export interface Winner {
  quarter: 'q1' | 'q2' | 'q3' | 'final'
  name: string
  row: number
  col: number
  payout: number
}

export const PLAYER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
  '#f43f5e', '#84cc16', '#10b981', '#0ea5e9', '#8b5cf6'
]

export function getPlayerColor(name: string, allNames: string[]): string {
  const uniqueNames = [...new Set(allNames.filter(Boolean))]
  const index = uniqueNames.indexOf(name)
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

// Fallback UUID generator for browsers without crypto.randomUUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function createEmptyGame(): Game {
  return {
    id: generateUUID(),
    teamA: 'Patriots',
    teamB: 'Seahawks',
    costPerSquare: 2,
    payouts: { q1: 20, q2: 20, q3: 20, final: 40 },
    grid: Array(10).fill(null).map(() => Array(10).fill(null)),
    rowNumbers: null,
    colNumbers: null,
    scores: { q1: null, q2: null, q3: null, final: null },
    isLocked: false,
    createdAt: new Date().toISOString()
  }
}

export function shuffleNumbers(): number[] {
  const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[nums[i], nums[j]] = [nums[j], nums[i]]
  }
  return nums
}

export function getWinner(
  game: Game,
  quarter: 'q1' | 'q2' | 'q3' | 'final'
): Winner | null {
  const score = game.scores[quarter]
  if (!score || !game.rowNumbers || !game.colNumbers) return null

  const teamADigit = score.teamA % 10
  const teamBDigit = score.teamB % 10

  const row = game.rowNumbers.indexOf(teamADigit)
  const col = game.colNumbers.indexOf(teamBDigit)

  const name = game.grid[row][col]
  if (!name) return null

  const totalPot = game.costPerSquare * 100
  const payout = (game.payouts[quarter] / 100) * totalPot

  return { quarter, name, row, col, payout }
}
