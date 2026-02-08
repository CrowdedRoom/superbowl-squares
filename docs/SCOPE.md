# Super Bowl Squares App — Scope

**Target:** Super Bowl LIX (Feb 9, 2026)
**Teams:** TBD vs TBD (will make configurable)
**Deadline:** Ready by tomorrow morning

---

## What is Super Bowl Squares?

A 10x10 grid (100 squares) betting game:
1. Players buy/claim squares by putting their name in cells
2. Once filled, numbers 0-9 are randomly assigned to rows (Team A) and columns (Team B)
3. At end of each quarter, check last digit of each team's score
4. The square at that intersection wins the pot for that quarter

---

## MVP Features (Must Have)

### Grid Management
- [x] 10x10 grid display
- [x] Claim squares by tapping and entering name
- [x] Visual distinction for claimed vs empty squares
- [x] Color-code by player name (auto-assign colors)

### Number Assignment
- [x] "Lock Grid" button (no more claims)
- [x] Random number assignment (0-9) to rows and columns
- [x] Display numbers on grid edges

### Score Tracking
- [x] Enter scores for each quarter (Q1, Q2, Q3, Final)
- [x] Highlight winning square for each quarter
- [x] Show winner name + prize for each quarter

### Game Setup
- [x] Set team names (e.g., "Chiefs" vs "49ers")
- [x] Set cost per square (e.g., $5)
- [x] Set payout structure (e.g., 20/20/20/40 per quarter)

---

## Nice to Have (If Time)

- [ ] Share link so others can claim squares on their phone
- [ ] Real-time sync (Supabase)
- [ ] Print-friendly view
- [ ] History of past games

---

## Tech Stack

- **Framework:** Next.js (fast to build)
- **Storage:** localStorage for MVP (works offline, instant)
- **Styling:** Tailwind CSS
- **Hosting:** Can run locally or deploy to Vercel

---

## Data Model

```typescript
interface Game {
  id: string
  teamA: string  // Row team (e.g., "Chiefs")
  teamB: string  // Column team (e.g., "49ers")
  costPerSquare: number
  payouts: { q1: number; q2: number; q3: number; final: number }
  grid: (string | null)[][]  // 10x10, player names or null
  rowNumbers: number[] | null  // 0-9 shuffled, assigned after lock
  colNumbers: number[] | null  // 0-9 shuffled, assigned after lock
  scores: {
    q1: { teamA: number; teamB: number } | null
    q2: { teamA: number; teamB: number } | null
    q3: { teamA: number; teamB: number } | null
    final: { teamA: number; teamB: number } | null
  }
  isLocked: boolean
  createdAt: string
}
```

---

## Screens

1. **Home** — Create new game or load existing
2. **Grid View** — Main game board, claim squares, see winners
3. **Admin Panel** — Enter scores, lock grid, assign numbers

---

## Timeline

- **Tonight:** Build core grid + claiming
- **Morning:** Number assignment + score tracking
- **Before game:** Test and ready to use

Let's go! 🏈
