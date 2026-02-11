# Casino Lab Backend

**Simulation Engine** - Node.js backend for the Online Casino Simulator

## Overview

The backend is a high-performance simulation engine built with Fastify and PostgreSQL. It models casino operations using discrete hour-based ticks, processing thousands of player bets per simulation cycle using worker threads.

## Requirements

- Node.js LTS (>= 20.0.0)
- npm >= 8.0.0
- PostgreSQL 16+ (via Docker or local installation)

## Installation

From the **repository root**:

```bash
npm install
```

This installs dependencies for all workspaces, including the backend.

## Environment Setup

The backend requires environment variables. Copy the example file:

```bash
cp backend/.env.example backend/.env
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `NODE_ENV` | `development` | Environment mode |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/casino_dev` | PostgreSQL connection string |
| `DB_POOL_MAX` | `10` | Max database connections |
| `RNG_SEED` | (optional) | Seed for deterministic RNG |

## Database Setup

### Start PostgreSQL

From the repository root:

```bash
docker-compose up -d
```

This starts PostgreSQL 16 on port 5432 with:
- **Database:** `casino_dev`
- **User:** `postgres`
- **Password:** `postgres`

Check database health:

```bash
docker-compose ps
```

### Run Migrations

From the repository root:

```bash
npm run db:migrate
```

To rollback the last migration:

```bash
npm run db:rollback
```

### Database Schema

**`players` table:**
- Player state (wallet balance, lifetime P/L, archetype, DNA traits)
- Indexed by status and archetype

**`casino_state` table:**
- Single-row global state (house revenue, active player count)
- Always contains exactly one row with id=1

**`sessions` table:**
- Player gaming sessions with start/end times and balance snapshots
- Foreign key to players with cascade delete
- Indexed by player_id and started_at

**`game_rounds` table:**
- Individual bet/spin results within sessions
- Foreign key to sessions with cascade delete
- Includes bet amount, multiplier, payout, balance
- CHECK constraints ensure non-negative monetary values
- Indexed by session_id and occurred_at

### Stop Database

```bash
docker-compose down
```

To remove the data volume:

```bash
docker-compose down -v
```

## Development

### Run Development Server

From the repository root:

```bash
npm run dev:backend
```

The server starts at **http://localhost:3000** with hot-reload enabled. Changes to `.ts` files automatically restart the server.

### Build for Production

From the repository root:

```bash
npm run build:backend
```

This compiles TypeScript from `backend/src/` to `backend/dist/`.

### Run Production Build

```bash
cd backend
npm start
```

Runs the compiled JavaScript from `dist/`.

## Testing

From the repository root:

```bash
npm test
```

Tests use Node.js built-in test runner with TypeScript support via `tsx`.

### Test Structure

- **Unit tests:** Models, services, RNG, slot registry
- **Integration tests:** API endpoints, database operations
- **Simulation tests:** Micro-bet loop, orchestrator, worker pool

All tests run against the same PostgreSQL database configured in `.env`.

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok"
}
```

### Get Casino State

Returns complete simulation state (casino totals + all players).

```bash
curl http://localhost:3000/state
```

**Response (200 OK):**
```json
{
  "casino": {
    "id": 1,
    "house_revenue": "12345.67",
    "active_player_count": 42,
    "updated_at": "2026-02-11T12:00:00.000Z"
  },
  "players": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "archetype": "Recreational",
      "status": "Active",
      "walletBalance": "100.50",
      "lifetimePL": "-23.45",
      "remainingCapital": "76.55",
      "dnaTraits": {
        "basePReturn": 0.42,
        "riskAppetite": 0.35,
        "betFlexibility": 0.15,
        "promoDependency": 0.10,
        "stopLossLimit": 0.85,
        "profitGoal": null,
        "initialCapital": 75.32,
        "preferredVolatility": "low"
      },
      "createdAt": "2026-02-11T10:00:00.000Z",
      "updatedAt": "2026-02-11T11:30:00.000Z"
    }
  ]
}
```

**Performance:**
- Handles 1,000+ players efficiently
- Single database query for all players
- Casino state cached in memory
- Response time: <50ms for 100 players, <100ms for 1,000 players

**Error Responses:**
- `503 Service Unavailable` - Casino state not loaded (server initializing)
- `500 Internal Server Error` - Database query failed

### Create Player

Creates a new player with specified archetype.

```bash
curl -X POST http://localhost:3000/players \
  -H "Content-Type: application/json" \
  -d '{"archetype": "Recreational"}'
```

**Request Body:**
```json
{
  "archetype": "Recreational" | "VIP" | "BonusHunter"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "archetype": "Recreational",
  "status": "Idle",
  "walletBalance": "0.00",
  "lifetimePL": "0.00",
  "remainingCapital": "75.32",
  "dnaTraits": { ... },
  "createdAt": "2026-02-11T12:00:00.000Z",
  "updatedAt": "2026-02-11T12:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or missing archetype

### Simulate Hour Tick

Processes one hour of simulation for all active players.

```bash
curl -X POST http://localhost:3000/simulate/hour
```

**Response (200 OK):**
```json
{
  "playersProcessed": 42,
  "totalSpins": 12543,
  "houseRevenue": "1234.56",
  "playersBroke": 3
}
```

**What Happens:**
1. Filter for `Active` players only
2. For each player, execute micro-bet loop:
   - Calculate spins for the hour based on archetype
   - Execute each spin: RNG → slot model → balance mutation
   - Early exit if balance < min bet (status → `Broke`)
3. Batch update player states
4. Update casino totals

## Project Structure

```
backend/
├── src/
│   ├── app.ts                         # Fastify app factory
│   ├── server.ts                      # Server entrypoint
│   ├── constants/
│   │   └── archetypes.ts              # Player archetype templates
│   ├── database/
│   │   └── batchOperations.ts         # Batch DB operations
│   ├── db/
│   │   └── pool.ts                    # PostgreSQL connection pool
│   ├── engine/
│   │   ├── spin.ts                    # Spin engine (RNG + slot model)
│   │   └── types.ts                   # Engine types
│   ├── models/
│   │   ├── player.ts                  # Player model & mappings
│   │   ├── session.ts                 # Session model & mappings
│   │   └── gameRound.ts               # Game round model & mappings
│   ├── services/
│   │   ├── playerService.ts           # Player CRUD operations
│   │   ├── sessionService.ts          # Session logic
│   │   └── rng.ts                     # Seeded RNG service
│   ├── simulation/
│   │   ├── betCalculator.ts           # Bet sizing logic
│   │   ├── microBetLoop.ts            # Single player simulation
│   │   ├── simulationOrchestrator.ts  # Hour tick coordinator
│   │   └── types.ts                   # Simulation types
│   ├── slots/
│   │   ├── slotModels.config.ts       # Slot volatility models
│   │   └── slotRegistry.ts            # Slot model registry
│   ├── state/
│   │   └── casinoState.ts             # Casino state cache
│   └── workers/
│       ├── simulationWorker.ts        # Worker thread script
│       ├── workerPool.ts              # Worker pool manager
│       └── types.ts                   # Worker types
├── test/                              # Test files (*.test.ts)
├── migrations/                        # Database migrations
├── dist/                              # Compiled output (generated)
├── .env                               # Environment variables (not in git)
├── .env.example                       # Example environment file
├── .pgmigraterc.json                  # Migration tool config
├── package.json                       # Backend dependencies
├── tsconfig.json                      # TypeScript config
└── README.md                          # This file
```

## Scripts Reference

All commands should be run from the **repository root**:

### Application
- `npm run dev:backend` - Start development server with hot-reload
- `npm run build:backend` - Compile TypeScript to JavaScript
- `npm test` - Run test suite

### Database
- `npm run db:migrate` - Run pending migrations
- `npm run db:rollback` - Rollback last migration

## Architecture Decisions

### Deterministic RNG

All randomness uses `seedrandom` with optional `RNG_SEED` environment variable. This enables:
- **Reproducible simulations** for debugging
- **Deterministic testing** with fixed seeds
- **No client-side randomness** (server authority)

### Worker Threads

Hour tick simulations use a worker pool to offload micro-bet loops:
- **1 worker:** ≤ 250 players
- **2 workers:** 251-500 players
- **3 workers:** 501-750 players
- **4 workers:** > 750 players

This prevents the API from blocking during heavy computation.

### Batch Database Operations

To minimize I/O overhead:
- Player state mutations happen **immediately in memory** during simulation
- Game rounds and session history are **batch inserted** at end of hour tick
- Casino state uses **in-memory cache** with periodic DB sync

### Slot Models

Three volatility models with exact probability tables:
- **Low:** High hit frequency (~28.5%), small wins, max 500x
- **Medium:** Balanced (~22.0%), occasional big wins, max 2,500x
- **High:** Low hit frequency (~14.5%), rare massive wins, max 10,000x

All models have ~96% RTP. See `../.claude/knowledge-base/slot-models.md` for details.

## Troubleshooting

### Database Connection Errors

Ensure PostgreSQL is running:

```bash
docker-compose ps
```

Check `DATABASE_URL` in `backend/.env`.

### Port Already in Use

Another process is using port 3000. Change `PORT` in `backend/.env` or kill the process:

```bash
# Find process on Windows
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Tests Failing

Ensure database migrations are up to date:

```bash
npm run db:migrate
```

Run tests with verbose output:

```bash
cd backend
npx tsx --test test/*.test.ts
```

## Contributing

When adding features:

1. Write tests first (TDD approach)
2. Update relevant documentation
3. Log changes in `../.claude/development.md`
4. Ensure all tests pass before committing

## License

ISC
