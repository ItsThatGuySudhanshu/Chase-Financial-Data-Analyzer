# Chase Financial Data Analyzer

A fully local, privacy-first spending analyzer for Chase bank statements. Upload your Chase CSV exports, visualize spending trends, and track monthly budgets — all running on your own machine with no data leaving it.

---

## Features

- **CSV Ingestion** — Upload Chase activity exports via drag-and-drop or drop CSVs into the `sheets/` folder for auto-ingestion on startup. Duplicate transactions are automatically skipped.
- **Dashboard** — At-a-glance stat strip (total spend, transaction count, avg. transaction, top category), monthly spending bar chart, category pie chart, and a top-merchants breakdown.
- **Transaction Search** — Full-text search and filter across all transactions by keyword, category, date range, and amount.
- **Budget Tracker** — Set monthly spend limits per category, track progress with visual progress bars, and manage budgets in a collapsible bulk editor. Over-budget categories are highlighted in red.

---

## Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Vite |
| **Charts** | Recharts |
| **HTTP client** | Axios |
| **Date utilities** | date-fns |
| **Styling** | Vanilla CSS (no framework) |
| **Backend** | Go (net/http) |
| **Router** | go-chi/chi v5 |
| **CORS** | rs/cors |
| **Database** | SQLite (via Go's database/sql) |
| **Dev runner** | concurrently (Go + Vite in one command) |

---

## Project Structure

```
Chase-Financial-Data-Analyzer/
├── backend/
│   ├── main.go          # Server entry point, router setup, startup auto-scan
│   ├── handlers.go      # All HTTP handler functions
│   ├── database.go      # SQLite init, schema, DB handle
│   └── parser.go        # Chase CSV parser with deduplication
├── frontend/
│   └── src/
│       ├── App.tsx                      # Root component, data fetching, tab routing
│       └── components/
│           ├── Dashboard.tsx            # Stats, charts, top merchants
│           ├── BudgetTracker.tsx        # Monthly budget management
│           ├── TransactionSearch.tsx    # Search & filter transactions
│           └── Uploader.tsx             # CSV upload button
├── sheets/              # Drop Chase CSV files here for auto-ingestion on startup
├── package.json         # Root scripts (dev, build, preview)
└── vite.config.ts
```

---

## API Reference

All endpoints are prefixed with `/api`. The backend runs on `http://localhost:8080`.

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/transactions` | Returns all transactions ordered by date descending |
| `GET` | `/api/summary` | Returns total spend grouped by category (positive values, spending only) |

### CSV Ingestion

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload a Chase CSV file (`multipart/form-data`, field: `file`). Returns `{ inserted: N }` |
| `POST` | `/api/scan` | Trigger a manual re-scan of the `sheets/` directory. Returns `{ inserted: N }` |

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/budgets` | Returns all budget rules |
| `POST` | `/api/budgets` | Create or update a single budget rule `{ month, category, amount }` |
| `POST` | `/api/budgets/bulk` | Upsert multiple budget rules in a single transaction `[{ month, category, amount }]` |
| `DELETE` | `/api/budgets/{id}` | Delete a budget rule by ID |

> Budget upserts use `ON CONFLICT(month, category) DO UPDATE`, so re-submitting the same month + category updates the amount rather than creating a duplicate.

---

## Getting Started

**Prerequisites:** Go 1.21+, Node.js 18+

```bash
# Install frontend dependencies
npm install

# Start both the Go backend and Vite dev server together
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080/api`

To pre-load transactions without the UI, drop any Chase CSV exports into the `sheets/` folder — they'll be picked up automatically the next time the backend starts.

---

## Data & Privacy

All data is stored in a local SQLite database file (`backend/chase.db`) on your machine. Nothing is sent to any external service.
