# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT INSTRUCTIONS
- Never implement features that I did not ask for.
- Only move forward in small incremental steps.
- Ask when making critical decisions.
- After you have successfully implemented and verified a feature add it to `.claude/development.md`.

## Project Overview

This is an **Online Casino Simulator** - a client-server application modeling digital casino operations with simulated player behavior, financial volatility, and population dynamics.

## Project Structure

This is a monorepo containing backend and frontend workspaces:

```
casino-lab/
├── backend/              # Node.js + Fastify simulation engine
│   ├── src/             # Backend source code
│   ├── test/            # Backend tests
│   ├── migrations/      # Database migrations
│   └── package.json     # Backend dependencies
├── frontend/            # React monitoring dashboard
│   ├── src/             # Frontend source code
│   └── package.json     # Frontend dependencies
├── .claude/             # Project documentation
│   ├── CLAUDE.md        # This file
│   ├── development.md   # Backend changelog
│   ├── frontend-development.md  # Frontend changelog
│   └── knowledge-base/  # Game math and logic specs
├── package.json         # Workspace root configuration
└── docker-compose.yml   # PostgreSQL database
```

**Important Paths:**
- Backend code: `backend/src/`
- Backend tests: `backend/test/`
- Frontend code: `frontend/src/`
- Database migrations: `backend/migrations/`

## Technical Stack

### Backend (Simulation Engine)
* **Runtime:** Node.js (LTS)
* **Framework:** Fastify
* **Database:** PostgreSQL
* **RNG:** `seedrandom` (Enables deterministic, reproducible simulation results)
* **Concurrency:** Node.js Worker Threads (Offloads heavy micro-bet loops to prevent API blocking)

### Frontend (Monitoring Dashboard)
* **Framework:** React with Vite
* **Data Fetching:** TanStack Query (Configured for polling the `/state` endpoint)
* **Styling:** Tailwind CSS (For rapid dashboard layout development)
* **Communication:** REST API (Client is view-only; no local logic)

### Infrastructure & State
* **State Management:** Immediate server-side mutations (No eventual consistency)
* **Scaling:** Batch database updates (including session and game round history) per hour tick to minimize I/O overhead.

## Core Design Principles

### The Golden Rule: Server-Side Calculations Only
**CRITICAL:** The GUI NEVER calculates money or game logic. It only displays what the server reports. All mathematical operations, RNG, player state mutations, and financial calculations must occur server-side.

### Simulation Clock & Execution Model
The simulation operates on discrete **hour ticks**. When "Simulate 1 hour" is triggered:
1. Filter for `Active` players only
2. For each player, execute a **micro-bet loop**:
   - Calculate total spins for the hour based on player archetype
   - For each spin: RNG draw (0.0-1.0) → lookup in slot model probability table → apply multiplier → mutate balances immediately
   - Early exit if balance < Min Bet → set status to `Broke`
3. Batch update all player states
4. Update casino totals

## Game Mathematics

All slot models are defined in `.claude/knowledge-base/slot-models.md`. Critical parameters:

### Low Volatility ("The Steady Farmer")
- Hit frequency: ~28.5%, RTP: ~96%
- Max win: 500x, frequent small wins (0.50x-2.00x)
- Use probability table for precise RNG mapping

### Medium Volatility ("The Golden Temple")
- Hit frequency: ~22.0%, RTP: ~96%
- Max win: 2,500x, balanced risk/reward
- Occasional wins up to 100x-300x

### High Volatility ("The Dragon's Hoard")
- Hit frequency: ~14.5%, RTP: ~96%
- Max win: 10,000x, long dry spells with rare massive wins
- Requires larger bankrolls to sustain

**Implementation Note:** Use weighted probability tables exactly as specified. Each row defines a probability bracket - compare RNG float against cumulative probabilities to select the win multiplier.

## Player Behavior System

### Archetypes (see `.claude/knowledge-base/player-archetypes.md`)

**Recreational Player (65% of population)**
- Low stakes (€0.10-€1.00), static betting
- Plays for entertainment, exits regardless of P/L
- Low loyalty (30-50% return probability)

**VIP (10% of population)**
- High stakes (€0.50-€5.00+), aggressive bet scaling
- Plays until balance = €0
- Very high loyalty (85-98% return probability)

**Bonus Hunter (25% of population)**
- Medium stakes, calculated/disciplined
- **Will NOT play without active bonus/free spins**
- Exits at 1.5-2.0x profit goal

### Player DNA Traits (see `.claude/knowledge-base/player-dna.md`)

Each player is assigned genetic traits that drive behavior:
- `base_p_return`: Return session probability (0.0-1.0)
- `risk_appetite`: Determines slot volatility preference
- `bet_flexibility`: 0.0 = static bets, 1.0 = aggressive scaling
- `promo_dependency`: 1.0 = requires bonus to play, 0.0 = plays freely
- `stop_loss_limit`: % of bankroll before forced exit
- `profit_goal`: Win multiplier triggering withdrawal

**Session Trigger Logic:** Bonus Hunters ONLY play if `hasActiveBonus() || hasFreeSpins()`. Others play based on `Math.random() < base_p_return`. Newly generated players always play the first session.

## Player Actions & State Machine

Available actions (see `.claude/knowledge-base/player-actions.md`):
1. **Start Session:** Idle → Active, select game volatility
2. **Deposit:** Increase wallet balance (may trigger bonus)
3. **Claim Free Spins:** Queue non-cash spins
4. **Claim Cashback:** Award % of net losses
5. **Bet:** Execute single spin (deduct → RNG → credit)
6. **Withdraw:** Transfer balance out, increment lifetime withdrawals
7. **End Session:** Active → Idle, finalize session stats

## Rewards System (see `.claude/knowledge-base/rewards.md`)

### Player Tiers
- **Tier 1 (Minnow):** < $500 daily turnover
- **Tier 2 (Dolphin):** $500-$5,000 daily turnover
- **Tier 3 (Whale):** > $5,000 daily turnover

### Free Spin Triggers
- **Retention:** After 72h inactivity (10-100 spins based on tier)
- **Winner Bonus:** Net profit > 0 AND turnover > $2,000 (20 golden spins)

### Weekly Cashback
- 5%-20% of net loss, scaled by loss bracket

## MVP Features

### Server Endpoints Required
- `POST /player/create` - Generate new player with archetype-driven DNA
- `POST /simulate/hour` - Execute hour tick batch operation
- `GET /state` - Return current casino state (all players + totals)

### Frontend UI Components
- **Create New Player** button → triggers server-side generation
- **Simulate 1 Hour** button → triggers batch processing
- **Player Table:** ID, Archetype, Casino Balance, Remaining Capital, Lifetime P/L, Status
- **Casino Overview:** Total House Revenue, Active Player Count

### Data Flow
Frontend polls server for state updates. No local calculations. Display-only.

## Technical Constraints

### Scalability Target
Server must handle 1,000+ players per hour tick without UI freezing. Use batch operations, avoid N+1 queries.

### Determinism
All RNG must be server-side. No client-side randomness. Consider seed-based RNG for reproducible simulations.

### State Integrity
Player balance mutations happen immediately within the simulation logic. While the state is consistent, game round and session history are persisted via batch inserts at the end of the hour tick to ensure performance.

## Knowledge Base Reference

All simulation logic constraints are defined in `.claude/knowledge-base/`:
- `slot-models.md` - Game math, probability tables, RTP calculations
- `player-archetypes.md` - Behavioral profiles, betting patterns
- `player-dna.md` - Genetic trait system, archetype templates
- `player-actions.md` - State machine actions and effects
- `rewards.md` - Loyalty tiers, free spins, cashback logic

When implementing any player behavior, game mechanics, or reward systems, **always reference these files first** to ensure compliance with the specified mathematical models.

## Changelog

- Backend feature implementations are tracked in `.claude/development.md`
- Frontend feature implementations are tracked in `.claude/frontend-development.md`