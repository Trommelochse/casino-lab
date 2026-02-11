# Casino Lab Frontend

Real-time monitoring dashboard for the Casino Lab simulation engine.

## Technology Stack

- **React 18.3+** with TypeScript (strict mode)
- **Vite 7.x** - Fast build tool with HMR
- **Tailwind CSS 4.1** - Utility-first CSS with Oxide engine
- **TanStack Query v5** - Data fetching and polling

## Development

### Prerequisites

- Node.js LTS
- Backend server running on `http://localhost:3000`

### Quick Start

```bash
# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Features

- ✅ Real-time polling of `/state` endpoint (every 5 seconds)
- ✅ Casino overview (house revenue, active player count)
- ✅ Player count display
- ✅ Automatic error handling and retry logic
- ✅ Loading states and visual refresh indicators

### API Proxy Configuration

Vite is configured to proxy API requests to the backend:

```typescript
// vite.config.ts
proxy: {
  '/state': 'http://localhost:3000',
  '/players': 'http://localhost:3000',
  '/simulate': 'http://localhost:3000',
}
```

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts        # API fetch functions
│   │   └── queryKeys.ts     # TanStack Query keys
│   ├── hooks/
│   │   └── useCasinoState.ts  # Custom polling hook
│   ├── types/
│   │   └── casino.ts        # TypeScript interfaces
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point with QueryClient
│   └── index.css            # Tailwind imports + theme
├── vite.config.ts           # Vite configuration
└── package.json
```

## Design Philosophy

**The Golden Rule:** The frontend NEVER calculates money or game logic. It only displays what the server reports.

- All calculations happen server-side
- Frontend is display-only
- No local state mutations
- Polling-based data updates (no WebSockets in MVP)

## Development Workflow

```bash
# Terminal 1: Start backend (from repo root)
cd C:\servemens\casino-lab
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Open browser to http://localhost:5173/
```

## Future Enhancements

- Player table with sorting/filtering
- Create player button with archetype selection
- Simulate hour button
- Charts and visualizations
- Session replay functionality
