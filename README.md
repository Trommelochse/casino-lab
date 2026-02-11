# Casino Lab

**Online Casino Simulator** - A client-server application modeling digital casino operations with simulated player behavior, financial volatility, and population dynamics.

## Project Structure

This is a monorepo containing both backend and frontend workspaces:

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
├── package.json         # Workspace root configuration
└── docker-compose.yml   # PostgreSQL database
```

## Quick Start

### Prerequisites

- **Node.js** LTS (>= 20.0.0)
- **npm** >= 8.0.0
- **Docker & Docker Compose** (for local database)

### Installation

Install all workspace dependencies:

```bash
npm install
```

### Database Setup

Start PostgreSQL using Docker Compose:

```bash
docker-compose up -d
```

Run database migrations:

```bash
npm run db:migrate
```

### Development

Start the backend server (http://localhost:3000):

```bash
npm run dev:backend
```

In another terminal, start the frontend dashboard (http://localhost:5173):

```bash
npm run dev:frontend
```

Or start both simultaneously:

```bash
npm run dev:all
```

### Testing

Run backend tests:

```bash
npm test
```

## Workspace Commands

### Development

- `npm run dev` - Start backend server (alias for dev:backend)
- `npm run dev:backend` - Start backend server with hot-reload
- `npm run dev:frontend` - Start frontend dev server with Vite
- `npm run dev:all` - Start both backend and frontend

### Build

- `npm run build` - Build both workspaces
- `npm run build:backend` - Compile backend TypeScript
- `npm run build:frontend` - Build frontend for production

### Testing & Database

- `npm test` - Run backend tests
- `npm run db:migrate` - Run database migrations
- `npm run db:rollback` - Rollback last migration

## Architecture

### Backend (Simulation Engine)

- **Runtime:** Node.js with TypeScript
- **Framework:** Fastify (high-performance REST API)
- **Database:** PostgreSQL 16+ with connection pooling
- **RNG:** Seedrandom (deterministic, reproducible simulations)
- **Concurrency:** Worker Threads (offload micro-bet loops)

See [backend/README.md](backend/README.md) for detailed backend documentation.

### Frontend (Monitoring Dashboard)

- **Framework:** React 18 with Vite
- **Data Fetching:** TanStack Query (polling `/state` endpoint)
- **Styling:** Tailwind CSS
- **Communication:** REST API (view-only, no client-side logic)

The frontend displays server-calculated state. All game logic, RNG, and financial calculations occur server-side.

## Core Features

### Simulation Engine

- **Hour-based discrete simulation** with batch processing
- **Player archetypes:** Recreational (65%), VIP (10%), Bonus Hunter (25%)
- **DNA trait system:** Genetic behavioral traits drive player decisions
- **Three slot volatility models:** Low, Medium, High (see `.claude/knowledge-base/slot-models.md`)
- **Worker pool architecture:** Handles 1,000+ players per hour tick

### Player Behavior

- **Session triggers:** Based on `basePReturn`, active bonuses, or promo dependency
- **Dynamic betting:** Static to aggressive scaling based on `betFlexibility`
- **Exit conditions:** Broke, stop-loss limit, or profit goal achieved
- **Reward system:** Free spins, cashback, tiered loyalty programs

### Monitoring Dashboard

- **Real-time state display:** Casino totals and player list
- **Player management:** Create new players with archetype selection
- **Simulation controls:** Trigger hour ticks and observe results
- **TanStack Query polling:** Auto-refresh every 2 seconds

## Technical Documentation

Detailed design documents are in `.claude/`:

- **CLAUDE.md** - Project overview and AI assistant instructions
- **development.md** - Backend feature changelog
- **frontend-development.md** - Frontend feature changelog
- **knowledge-base/** - Game math, player archetypes, rewards logic

## Database

PostgreSQL 16+ with the following schema:

- **players** - Player state, wallet balances, DNA traits
- **casino_state** - Global casino statistics (single-row table)
- **sessions** - Player gaming sessions with start/end times
- **game_rounds** - Individual bet/spin results

Start database:
```bash
docker-compose up -d
```

Stop database:
```bash
docker-compose down
```

## API Endpoints

Backend server runs on **http://localhost:3000**

- `GET /health` - Health check
- `GET /state` - Complete casino state (casino + all players)
- `POST /players` - Create new player with archetype
- `POST /simulate/hour` - Execute hour tick simulation

See [backend/README.md](backend/README.md) for detailed API documentation.

## License

ISC
