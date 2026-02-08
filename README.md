# Casino Lab Backend

Online Casino Simulator - Backend Simulation Engine

## Requirements

- Node.js LTS (>= 20.0.0)
- npm or yarn
- Docker & Docker Compose (for local database)
- PostgreSQL 16+ (if not using Docker)

## Installation

```bash
npm install
```

## Environment Setup

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

Default configuration:
- `PORT=3000` - Server port
- `HOST=0.0.0.0` - Server host
- `NODE_ENV=development` - Environment mode
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/casino_dev` - PostgreSQL connection string (required)
- `DB_POOL_MAX=10` - Maximum number of database connections in the pool (optional)
- `RNG_SEED` - Seed for deterministic random number generation (optional, for reproducible simulations)

## Database Setup

### Start PostgreSQL (Docker)

Start the local PostgreSQL database using Docker Compose:

```bash
docker-compose up -d
```

This will start PostgreSQL 16 on port 5432 with:
- Database: `casino_dev`
- User: `postgres`
- Password: `postgres`

Check database health:

```bash
docker-compose ps
```

### Run Migrations

Apply all pending migrations:

```bash
npm run db:migrate
```

Rollback the last migration:

```bash
npm run db:rollback
```

### Database Schema

The initial migration creates:

**`players` table:**
- Stores player state (wallet balance, lifetime P/L, archetype, DNA traits)
- Indexed by status and archetype for efficient queries

**`casino_state` table:**
- Single-row global state (house revenue, active player count)
- Always contains exactly one row with id=1

**`sessions` table:**
- Tracks player gaming sessions with start/end times and balance snapshots
- Foreign key to players table with cascade delete
- Indexed by player_id and started_at for efficient queries

**`game_rounds` table:**
- Stores individual bet/spin results within sessions
- Foreign key to sessions table with cascade delete
- Includes bet amount, multiplier, payout, and resulting balance
- CHECK constraints ensure all monetary values are non-negative
- Indexed by session_id and occurred_at for efficient queries

### Stop Database

```bash
docker-compose down
```

To also remove the data volume:

```bash
docker-compose down -v
```

## Development

### Run in Development Mode (with watch)

```bash
npm run dev
```

The server will start with hot-reload enabled. Any changes to `.ts` files will automatically restart the server.

### Build for Production

```bash
npm run build
```

This compiles TypeScript files from `src/` to `dist/`.

### Run Production Build

```bash
npm start
```

Runs the compiled JavaScript from `dist/`.

## Testing

Run all tests:

```bash
npm test
```

Tests are written using Node.js built-in test runner and run directly from TypeScript using `tsx`.

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

### Casino State

Get the current casino state (loaded from database on boot and cached in memory).

```bash
curl http://localhost:3000/state
```

**Response:**
```json
{
  "id": 1,
  "house_revenue": "0",
  "active_player_count": 0,
  "updated_at": "2025-02-07T12:00:00.000Z"
}
```

## Project Structure

```
casino-lab/
├── src/
│   ├── db/
│   │   └── pool.ts         # PostgreSQL connection pool
│   ├── state/
│   │   └── casinoState.ts  # Casino state cache
│   ├── app.ts              # Fastify app factory
│   └── server.ts           # Server entrypoint
├── test/
│   ├── health.test.ts      # Health check tests
│   └── state.test.ts       # Casino state tests
├── migrations/             # Database migrations
│   └── 1707328800000_init-schema.js
├── dist/                   # Compiled output (generated)
├── .env.example            # Example environment variables
├── .pgmigraterc.json       # Migration tool config
├── docker-compose.yml      # Local PostgreSQL setup
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts Reference

### Application
- `npm run dev` - Start development server with hot-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm test` - Run test suite

### Database
- `npm run db:migrate` - Run pending migrations
- `npm run db:rollback` - Rollback last migration
