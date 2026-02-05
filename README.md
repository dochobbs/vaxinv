# VaxInv

Vaccine inventory management system for pediatric clinics with VFC/private tracking, FEFO enforcement, and temperature monitoring.

## Features

- **Barcode scanning** — match NDC codes to vaccines on receive and administer
- **VFC / Private funding tracking** — separate inventory counts per funding source
- **FEFO enforcement** — First Expired, First Out selection during dose administration
- **Multi-dose vial tracking** — beyond-use date alerts after opening
- **Temperature monitoring** — log readings, flag excursions outside 36–46 °F
- **7 built-in reports** — inventory, administrations, wastage, temperature, audit, expiring, low-stock
- **CSV and PDF export** — download any report from the browser
- **Multi-location support** — manage inventory across clinics
- **Audit trail** — every create, update, receive, administer, and adjust is logged
- **Role-based access** — admin, manager, and MA roles with PIN or password login

## Quick Start (Local Development)

**Prerequisites:** Node.js 20+

```bash
git clone <repo-url> && cd vaxinv
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Create the database, run migrations, and seed
npm run migrate
npm run seed

# Start both servers (backend :3000, frontend :5173)
npm run dev
```

Open http://localhost:5173 and log in:

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |
| PIN      | `123456`   |

## Production Deployment (Docker)

```bash
docker compose up -d
```

This starts PostgreSQL 15 and the app on port 3000. On first run, migrations and seeds execute automatically.

> **Important:** Change `SESSION_SECRET` and the database password before deploying.

Override defaults with environment variables in `docker-compose.yml` or a `.env` file:

```yaml
environment:
  DB_CLIENT: pg
  DB_CONNECTION: postgres://vaxinv:vaxinv_secret@db:5432/vaxinv
  SESSION_SECRET: change-me-in-production
  NODE_ENV: production
  PORT: 3000
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_CLIENT` | `better-sqlite3` | Database driver (`better-sqlite3` or `pg`) |
| `DB_FILENAME` | `./data/vaxinv.db` | SQLite file path (ignored when using pg) |
| `DB_CONNECTION` | — | PostgreSQL connection string |
| `SESSION_SECRET` | `dev-secret-change-me` | Express session signing key |
| `PORT` | `3000` | HTTP listen port |
| `NODE_ENV` | `development` | `development`, `production`, or `test` |

## Project Structure

```
vaxinv/
├── backend/
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── app.js                # Express app, middleware, static serving
│   │   ├── db/
│   │   │   ├── connection.js     # Knex connection (SQLite / PostgreSQL)
│   │   │   ├── knexfile.js       # Knex config per environment
│   │   │   ├── migrations/       # 9 migration files (001–009)
│   │   │   └── seeds/            # Vaccine catalog + bootstrap admin
│   │   ├── middleware/
│   │   │   ├── auth.js           # Session auth + role guards
│   │   │   └── audit.js          # Audit log writer
│   │   └── routes/               # 10 route modules
│   └── tests/                    # 13 test files, 76 tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Router + layout
│   │   ├── api/client.js         # Fetch wrapper
│   │   ├── context/AuthContext.jsx
│   │   ├── components/           # BarcodeInput, Layout, SessionTimeout, ConnectionBanner
│   │   ├── pages/                # Dashboard, ReceiveInventory, AdministerDose, etc.
│   │   └── utils/export.js       # CSV + PDF helpers
│   └── vite.config.js            # Dev proxy → localhost:3000
├── scripts/
│   └── backup.sh                 # SQLite + PostgreSQL backup
├── Dockerfile                    # Multi-stage (build frontend, serve from backend)
├── docker-compose.yml            # App + PostgreSQL
└── package.json                  # Root: concurrently dev runner
```

## API Endpoints

All routes are prefixed with `/api`. Endpoints marked **auth** require a valid session. Endpoints marked **admin** require the `admin` role; **admin/manager** require either role.

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Username + password login |
| POST | `/api/auth/login-pin` | — | PIN login (MAs) |
| POST | `/api/auth/logout` | auth | Destroy session |
| GET | `/api/auth/me` | auth | Current user info |

### Vaccines

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vaccines` | auth | List active vaccines |
| GET | `/api/vaccines/match-ndc/:ndc` | auth | Match NDC barcode to vaccine |
| POST | `/api/vaccines` | admin | Create vaccine |
| PUT | `/api/vaccines/:id` | admin | Update vaccine |

### Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/inventory` | auth | List inventory (filter by location, funding, vaccine) |
| GET | `/api/inventory/fefo/:vaccineId` | auth | FEFO-sorted lots for a vaccine |
| GET | `/api/inventory/:id` | auth | Single inventory record |
| POST | `/api/inventory/receive` | auth | Receive new inventory |

### Administrations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/administrations` | auth | List doses given (filter by location, dates, vaccine) |
| POST | `/api/administrations` | auth | Administer a dose (FEFO enforced) |

### Adjustments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/adjustments` | auth | List adjustments (filter by location, type) |
| POST | `/api/adjustments` | auth | Create adjustment (waste, transfer, correction, etc.) |
| POST | `/api/adjustments/bulk-expire` | auth | Bulk-expire all expired lots at a location |
| POST | `/api/adjustments/recall` | admin/manager | Quarantine lots by lot number |

### Temperature

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/temperature` | auth | List temperature logs (filter by location, dates) |
| GET | `/api/temperature/excursions` | auth | Out-of-range readings only |
| POST | `/api/temperature` | auth | Log a temperature reading |

### Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/locations` | auth | List active locations |
| POST | `/api/locations` | admin | Create location |
| PUT | `/api/locations/:id` | admin | Update location |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | admin | List all users |
| POST | `/api/users` | admin | Create user |
| PUT | `/api/users/:id` | admin | Update user |
| PUT | `/api/users/:id/reset-pin` | admin | Reset a user's PIN |

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reports/inventory` | auth | Current inventory (CSV or JSON) |
| GET | `/api/reports/administrations` | auth | Administrations report |
| GET | `/api/reports/wastage` | auth | Wastage / adjustment report |
| GET | `/api/reports/temperature` | auth | Temperature log report |
| GET | `/api/reports/audit` | admin | Audit log report |
| GET | `/api/reports/expiring` | auth | Expiring inventory (default 30 days) |
| GET | `/api/reports/low-stock` | auth | Low stock report (threshold: 5 doses) |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | auth | Summary: inventory, expiring, low-stock, activity, vial alerts, temp excursions |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |

## Database Schema

Nine migrations create the following tables:

| # | Table | Key Columns |
|---|-------|-------------|
| 001 | `locations` | id, name, address, is_active |
| 002 | `users` | id, name, username, pin_hash, password_hash, role (ma/manager/admin), location_id |
| 003 | `vaccines` | id, name, short_name, cvx_code, cpt_code, ndc_pattern, manufacturer, doses_per_vial, beyond_use_days, min/max_age_months |
| 004 | `inventory` | id, vaccine_id, location_id, lot_number, expiration_date, ndc, funding_source (vfc/private), quantity_received, quantity_remaining, is_quarantined, opened_at, discard_after |
| 005 | `administrations` | id, inventory_id, location_id, administered_by_user_id, quantity, funding_source |
| 006 | `adjustments` | id, inventory_id, adjustment_type (waste/transfer_out/transfer_in/correction/expired/recall/borrowing/returned), quantity, reason, related_location_id |
| 007 | `temperature_logs` | id, location_id, unit_name, reading_f, reading_time, out_of_range, logged_by_user_id |
| 008 | `audit_log` | id, user_id, location_id, action, entity_type, entity_id, details (JSON) |
| 009 | `sessions` | sid, sess (JSON), expired |

## Seeded Vaccine Catalog

Twenty pediatric vaccines are pre-loaded with CVX codes, CPT codes, NDC matching patterns, manufacturer, doses-per-vial, and age ranges:

DTaP, IPV, MMR, Varicella, HepB, HepA, Hib, PCV15, PCV20, Rotavirus (RV5), Flu (Peds), Flu (Std), MenACWY, MenB, HPV, Tdap, Pediarix (DTaP-IPV-HepB), Kinrix (DTaP-IPV), MMRV (ProQuad), COVID (Peds)

Multi-dose vials (MMR: 10 doses, Flu Peds/Std: 10 doses) include beyond-use day tracking.

## Reports and Export

All report endpoints accept query parameters for filtering (location, date range, vaccine, type) and return JSON by default. Add `?format=csv` to download as CSV. The frontend also supports PDF export via jsPDF.

| Report | Endpoint | Filters |
|--------|----------|---------|
| Inventory | `/api/reports/inventory` | location_id, funding_source |
| Administrations | `/api/reports/administrations` | location_id, start_date, end_date, vaccine_id |
| Wastage | `/api/reports/wastage` | location_id, adjustment_type, start_date, end_date |
| Temperature | `/api/reports/temperature` | location_id, start_date, end_date |
| Audit | `/api/reports/audit` | — (admin only) |
| Expiring | `/api/reports/expiring` | days (default 30) |
| Low Stock | `/api/reports/low-stock` | threshold (default 5) |

## Backups

The included backup script handles both database engines:

```bash
# SQLite (default)
./scripts/backup.sh

# SQLite with custom output directory
./scripts/backup.sh /path/to/backups

# PostgreSQL (auto-detected when DB_CONNECTION is set)
DB_CONNECTION=postgres://... ./scripts/backup.sh
```

Backups are timestamped. The script automatically prunes files older than the most recent 30.

## Testing

The backend has 76 tests across 13 files using Vitest with in-memory SQLite:

```bash
# Run all tests
npm test

# Watch mode
cd backend && npm run test:watch
```

Tests cover authentication, all CRUD routes, FEFO logic, seed data validation, migrations, and database connectivity.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Express 4, Knex 3 (query builder + migrations) |
| Database | SQLite (dev) / PostgreSQL 15 (prod) |
| Auth | express-session + connect-session-knex, bcrypt |
| Frontend | React 19, React Router 7, TanStack Query 5 |
| Styling | Tailwind CSS 4 |
| Build | Vite 7 |
| Testing | Vitest 1, Supertest 6 |
| Export | PapaParse (CSV), jsPDF (PDF) |
| Container | Docker multi-stage build, docker-compose |
