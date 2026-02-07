# Casino Lab Backend

Online Casino Simulator - Backend Simulation Engine

## Requirements

- Node.js LTS (>= 20.0.0)
- npm or yarn

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

## Project Structure

```
casino-lab/
├── src/
│   ├── app.ts           # Fastify app factory
│   └── server.ts        # Server entrypoint
├── test/
│   └── health.test.ts   # Health check tests
├── dist/                # Compiled output (generated)
├── .env.example         # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts Reference

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm test` - Run test suite
