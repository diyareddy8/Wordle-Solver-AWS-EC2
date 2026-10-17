# Wordle Solver — Web Frontend

A React + TypeScript + Vite web client for the Wordle Solver, built on the same
flow as the [Flutter app](../frontend-android): a 6-row word board, an on-screen
keyboard, tap-to-cycle feedback tiles (grey → yellow → green), and a
"suggested guess" panel powered by the FastAPI [backend](../backend).

## How it works

- Type the 5-letter word you played in Wordle and press **Enter** to add it.
- Tap each tile in the latest row to cycle its color: grey (not in word) →
  yellow (wrong spot) → green (correct spot).
- Press **Get next guess** to ask the solver for the best next word. On an
  empty board, **Suggest opener** gives you a starting word.
- Press **Use word** to load the suggestion, then **Enter** to add it.
- The on-screen keys take on the colors you've entered, and the refresh icon
  in the header starts a new game.
- Supports light and dark mode (follows the system setting).

### Keyboard controls

| Key | Action |
| --- | --- |
| `A`–`Z` | Type a letter |
| `Backspace` / `Delete` | Delete a letter |
| `Enter` | Add the typed word; if nothing is typed, use the suggestion or fetch the next one |
| `1`–`5` | Cycle the color of that tile in the latest row |

## Project structure

```
src/
  config/apiConfig.ts     API base URL + endpoint paths
  models/gameState.ts     Request/response types for the solver API
  services/wordleApi.ts   fetch() calls to /health and /wordle/next-guess
  context/GameContext.tsx Game state + actions (mirrors the Flutter GameProvider)
  hooks/usePhysicalKeyboard.ts  Physical keyboard input
  components/             GameScreen, StatusPanel, WordRow, WordTile, Keyboard
```

## Getting started

```bash
npm install
npm run dev
```

The app defaults to the deployed backend at `https://wordlebotapp.onrender.com`.
To point at a different backend (e.g. a local FastAPI server), copy `.env.example`
to `.env.local` and set:

```
VITE_API_BASE_URL=http://localhost:8000
```

## Building

```bash
npm run build   # type-checks and outputs a static build to dist/
npm run preview # serve the production build locally
```

`dist/` is a static site and can be deployed to any static host (Render
Static Site, Netlify, Vercel, GitHub Pages, etc.) as long as `VITE_API_BASE_URL`
is set at build time if you need to override the default backend URL. The
backend already allows all CORS origins, so no backend changes are needed.
