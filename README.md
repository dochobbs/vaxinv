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

## Why We Built It This Way

Pediatric clinics participating in the **Vaccines for Children (VFC)** program must follow strict CDC inventory and storage rules. Most practices track this with spreadsheets or paper logs — which means manual errors, missed expirations, and audit headaches. VaxInv replaces that workflow with software that enforces the rules automatically.

### Design decisions

| Decision | Rationale |
|----------|-----------|
| **VFC / Private funding split** | VFC is a federal entitlement program. Clinics must track VFC-funded and privately purchased doses separately. Mixing them is an audit finding. The system enforces this at every receive, administer, and adjustment. |
| **FEFO enforcement** | The CDC requires First Expired, First Out usage to minimize waste. VaxInv sorts available lots by expiration date and selects the earliest automatically — staff cannot skip ahead to a newer lot. |
| **Multi-dose vial tracking** | Opened multi-dose vials (flu, MMR) have a beyond-use date set by the manufacturer. The system records when a vial is opened, calculates the discard deadline, and surfaces alerts before it expires. |
| **Temperature monitoring (36–46 °F)** | CDC guidelines require twice-daily temperature logs and immediate action on excursions. VaxInv flags out-of-range readings instantly and includes them in reports for VFC site visits. |
| **PIN login for MAs** | Medical assistants administer dozens of doses per day. A 6-digit PIN is fast enough for point-of-care use without slowing down patient flow. Admins and managers use full passwords for sensitive operations. |
| **NDC barcode scanning** | Scanning the barcode on a vaccine box auto-matches the NDC code to the correct vaccine in the catalog, eliminating manual selection errors during receiving. |
| **Audit trail on every action** | VFC auditors can request a full history of every dose received, administered, wasted, or transferred. The audit log captures who did what, when, and where — with no way to edit or delete entries. |
| **SQLite for dev, PostgreSQL for prod** | SQLite means zero setup to get running locally — no database server to install. Production uses PostgreSQL for concurrency, reliability, and proper backups. Knex abstracts the difference so the same code runs on both. |
| **Session-based auth (not tokens)** | This is an internal clinic tool behind a login screen, not a public API. Server-side sessions are simpler to manage, easier to revoke, and auto-expire after 8 hours of inactivity. |
| **Single Docker container** | Small clinics don't have IT staff. `docker compose up` gets the full system running with PostgreSQL in one command. No Kubernetes, no microservices, no complexity that doesn't earn its keep. |
| **Pre-loaded vaccine catalog** | 20 pediatric vaccines with correct CVX, CPT, and NDC codes are seeded on first run. Clinics can start receiving inventory immediately without manual vaccine setup. |

---

## Install Guide (Step by Step)

This section is for anyone setting up VaxInv for the first time, even if you've never used a terminal before. Follow every step in order.

### Step 1: Install Node.js

VaxInv runs on Node.js, a free program that executes JavaScript on your computer.

**Mac:**

1. Open **Terminal** (press `Cmd + Space`, type `Terminal`, press Enter)
2. Install Homebrew (a package manager) by pasting this line and pressing Enter:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. When it finishes, install Node.js:
   ```
   brew install node
   ```

**Windows:**

1. Go to https://nodejs.org
2. Click the big green button that says **"LTS"** (Long Term Support)
3. Run the downloaded installer — accept all defaults, click Next through every screen
4. When it finishes, open **Command Prompt** (press `Win + R`, type `cmd`, press Enter)

**Verify it worked** (both Mac and Windows):

```
node --version
```

You should see something like `v20.x.x` or `v22.x.x`. Any version 20 or higher is fine.

### Step 2: Download VaxInv

If you received VaxInv as a zip file, unzip it and note where you put it. Example: `Downloads/vaxinv`.

If you have Git installed and a repository URL:

```
git clone <repo-url>
```

### Step 3: Open a terminal in the VaxInv folder

**Mac:**

```
cd ~/Downloads/vaxinv
```

(Adjust the path if you put it somewhere else.)

**Windows:**

```
cd %USERPROFILE%\Downloads\vaxinv
```

### Step 4: Install dependencies

Run these three commands one at a time. Each one will print a lot of output — wait for it to finish before running the next.

```
npm install
```

```
cd backend && npm install && cd ..
```

```
cd frontend && npm install && cd ..
```

### Step 5: Set up the database

This creates the database tables and loads the vaccine catalog:

```
npm run migrate
```

```
npm run seed
```

You should see output about migrations running and seeds completing. No errors means it worked.

### Step 6: Start VaxInv

```
npm run dev
```

You'll see output from two servers starting. When you see lines mentioning both `backend` and `frontend` running, it's ready.

### Step 7: Open VaxInv in your browser

Open your web browser (Chrome, Safari, Edge, Firefox) and go to:

```
http://localhost:5173
```

### Step 8: Log in

Use these credentials to log in for the first time:

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

Or log in with a PIN:

| Field | Value    |
|-------|----------|
| PIN   | `123456` |

**After logging in**, go to the Users page and create accounts for your staff, then change the admin password.

### Step 9: Stop the server

When you're done, go back to the terminal and press `Ctrl + C` to stop both servers.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `node: command not found` | Node.js isn't installed. Go back to Step 1. |
| `npm: command not found` | Same as above — npm comes with Node.js. |
| `EACCES: permission denied` | On Mac, prefix the command with `sudo` (e.g., `sudo npm install`). |
| Port 3000 already in use | Another program is using that port. Close it, or set a different port: `PORT=3001 npm run dev` |
| Port 5173 already in use | Close other Vite dev servers, or check for other `npm run dev` processes. |
| `Cannot find module` errors | Re-run `npm install` in the folder that had the error (root, backend, or frontend). |
| Page won't load in browser | Make sure both servers are running. The terminal should show output from both. |
| Login doesn't work | Run `npm run seed` again to reset the default admin account. |

---

## Quick Start (Developers)

If you're comfortable with a terminal:

```bash
git clone <repo-url> && cd vaxinv
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm run migrate
npm run seed
npm run dev
```

Open http://localhost:5173. Login: `admin` / `admin123` / PIN `123456`.

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
