# AGENTS.md

Welcome, Agent. This repository contains the **Chase Financial Data Analyzer**, a local, privacy-first tool for analyzing financial transaction data from Chase CSV exports.

## Project Vision
- **Local-Only**: All data stays on the user's machine in a local SQLite database.
- **Privacy-First**: No external tracking, no cloud sync, no analytics.
- **Simplicity**: High-value visualizations with zero configuration.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript (Vite)
- **Styling**: Vanilla CSS. **Do NOT use TailwindCSS** or other utility frameworks unless explicitly requested. Use standard CSS variables for consistency.
- **Charts**: Recharts for data visualization.
- **Networking**: Axios for API calls.
- **Standard**: Functional components with hooks. Prefer modular, reusable components.

### Backend
- **Language**: Go 1.21+
- **Router**: `go-chi/chi` for lightweight HTTP routing.
- **Database**: SQLite3. Schema management is handled in `backend/database.go`.
- **Parsing**: Custom CSV parser designed for Chase "Activity" exports. deduplication is handled at the DB level.

---

## 🏗 Repository Structure

- `backend/`: Go server source, SQLite database, and CSV parsing logic.
- `frontend/`: React application source, organized by `components/` and `src/App.tsx`.
- `sheets/`: The primary ingestion point. Users drop CSVs here; the server scans this on startup.
- `public/`: Static assets for the frontend.

---

## 🚥 Coding Guidelines & Rules

1. **State Management**: Use React's built-in hooks (`useState`, `useEffect`, `useMemo`) for state. Avoid adding heavy state libraries (Redux, etc.) unless the application complexity justifies it.
2. **styling**: Keep styles in `.css` files. Follow a "component-first" styling approach where each component has its own CSS or uses global variables from `App.css`.
3. **API Consistency**: All backend responses should be JSON. Ensure proper error handling and status codes.
4. **Data Integrity**: When modifying the CSV parser, ensure deduplication logic (based on Transaction ID or composite keys) remains robust.
5. **Typescript**: All frontend code must use strict TypeScript. Avoid `any`.

---

## 🚀 Common Workflows

- **Starting Dev Environment**: Run `npm run dev` from the root. This uses `concurrently` to start both the Go backend and the Vite frontend.
- **Adding an API Endpoint**:
    1. Define the handler in `backend/handlers.go`.
    2. Register the route in `backend/main.go`.
    3. Update frontend services/fetching logic in `frontend/src/App.tsx` or specific components.
- **New Components**: Place new UI components in `frontend/src/components/`.
