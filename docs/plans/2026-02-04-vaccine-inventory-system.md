# Vaccine Inventory Management System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-hosted, scanner-first vaccine inventory management system for pediatric clinics with multi-location support, VFC compliance, multi-dose vial tracking, and audit-ready reporting.

**Architecture:** Monorepo with Express.js backend serving a React (Vite) frontend. Knex.js for database abstraction — SQLite for development, PostgreSQL for production (Docker). Session-based auth with 6+ digit PIN for MAs and username/password for admins. All inventory-changing actions logged to audit trail.

**Tech Stack:**
- Backend: Node.js, Express, Knex.js, bcrypt, express-session, helmet
- Frontend: React 18+, Vite, TailwindCSS, React Router, TanStack Query, jsPDF
- Database: SQLite (dev) / PostgreSQL (prod via Docker)
- Testing: Vitest (backend + frontend), Supertest (API integration)

---

## Phase 1: Project Scaffolding & Database

### Task 1: Initialize Repository and Monorepo Structure

**Files:**
- Create: `package.json` (root)
- Create: `backend/package.json`
- Create: `backend/src/index.js`
- Create: `frontend/package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

**Step 1: Initialize git repo**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv
git init
```

**Step 2: Create root package.json**

```json
{
  "name": "vaxinv",
  "version": "1.0.0",
  "private": true,
  "description": "Vaccine Inventory Management System",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "start": "cd backend && npm start",
    "test": "cd backend && npm test",
    "migrate": "cd backend && npm run migrate",
    "seed": "cd backend && npm run seed"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

**Step 3: Create backend package.json**

```json
{
  "name": "vaxinv-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "migrate": "knex migrate:latest --knexfile src/db/knexfile.js",
    "migrate:make": "knex migrate:make --knexfile src/db/knexfile.js",
    "seed": "knex seed:run --knexfile src/db/knexfile.js",
    "rollback": "knex migrate:rollback --knexfile src/db/knexfile.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.0.0",
    "connect-session-knex": "^4.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "helmet": "^7.1.0",
    "knex": "^3.1.0",
    "morgan": "^1.10.0",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "supertest": "^6.3.3",
    "vitest": "^1.6.0"
  }
}
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
.env
*.db
*.sqlite
.DS_Store
coverage/
```

**Step 5: Create .env.example**

```env
# Database (sqlite for dev, postgres for prod)
DB_CLIENT=better-sqlite3
DB_FILENAME=./data/vaxinv.db
# DB_CLIENT=pg
# DB_CONNECTION=postgres://vaxinv:vaxinv@localhost:5432/vaxinv

# Session
SESSION_SECRET=change-me-to-a-random-string

# Server
PORT=3000
NODE_ENV=development
```

**Step 6: Create docker-compose.yml**

```yaml
version: "3.8"
services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: vaxinv
      POSTGRES_USER: vaxinv
      POSTGRES_PASSWORD: vaxinv_secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DB_CLIENT: pg
      DB_CONNECTION: postgres://vaxinv:vaxinv_secret@db:5432/vaxinv
      SESSION_SECRET: change-me-in-production
      NODE_ENV: production
      PORT: 3000
    depends_on:
      - db

volumes:
  pgdata:
```

**Step 7: Create minimal backend entry point**

`backend/src/index.js`:
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`VaxInv server running on port ${PORT}`);
});

module.exports = app;
```

**Step 8: Install dependencies**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv
npm install
cd backend && npm install
```

**Step 9: Verify server starts**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend
node src/index.js &
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
kill %1
```

**Step 10: Commit**

```bash
git add -A
git commit -m "FEATURE: Initialize monorepo with Express backend scaffold"
```

---

### Task 2: Database Configuration and Knex Setup

**Files:**
- Create: `backend/src/db/knexfile.js`
- Create: `backend/src/db/connection.js`
- Create: `backend/data/.gitkeep`
- Create: `backend/vitest.config.js`
- Create: `backend/tests/db.test.js`

**Step 1: Write failing test for database connection**

`backend/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

`backend/tests/db.test.js`:
```javascript
const db = require('../src/db/connection');

describe('Database connection', () => {
  afterAll(async () => {
    await db.destroy();
  });

  it('connects and runs a raw query', async () => {
    const result = await db.raw('SELECT 1 + 1 AS result');
    // SQLite returns array, PG returns rows
    const val = Array.isArray(result) ? result[0].result : result.rows[0].result;
    expect(val).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend
npx vitest run
# Expected: FAIL — cannot find module '../src/db/connection'
```

**Step 3: Create knexfile.js**

`backend/src/db/knexfile.js`:
```javascript
require('dotenv').config({ path: '../../.env' });

const path = require('path');

const config = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: path.resolve(__dirname, '../data/vaxinv.db'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DB_CONNECTION,
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
    },
  },
  test: {
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
    },
  },
};

module.exports = config;
```

**Step 4: Create connection.js**

`backend/src/db/connection.js`:
```javascript
const knex = require('knex');
const config = require('./knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env]);

module.exports = db;
```

**Step 5: Create data directory**

```bash
mkdir -p /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend/data
touch /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend/data/.gitkeep
```

**Step 6: Run test to verify it passes**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend
NODE_ENV=test npx vitest run
# Expected: PASS
```

**Step 7: Commit**

```bash
git add -A
git commit -m "FEATURE: Add Knex database configuration with SQLite dev and Postgres prod support"
```

---

### Task 3: Database Schema — Core Migrations

**Files:**
- Create: `backend/src/db/migrations/001_create_locations.js`
- Create: `backend/src/db/migrations/002_create_users.js`
- Create: `backend/src/db/migrations/003_create_vaccines.js`
- Create: `backend/src/db/migrations/004_create_inventory.js`
- Create: `backend/src/db/migrations/005_create_administrations.js`
- Create: `backend/src/db/migrations/006_create_adjustments.js`
- Create: `backend/src/db/migrations/007_create_temperature_logs.js`
- Create: `backend/src/db/migrations/008_create_audit_log.js`
- Create: `backend/src/db/migrations/009_create_sessions.js`
- Create: `backend/tests/migrations.test.js`

**Step 1: Write failing test for migrations**

`backend/tests/migrations.test.js`:
```javascript
const knex = require('knex');
const config = require('../src/db/knexfile');

describe('Database migrations', () => {
  let db;

  beforeAll(async () => {
    db = knex(config.test);
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('creates locations table', async () => {
    const exists = await db.schema.hasTable('locations');
    expect(exists).toBe(true);
  });

  it('creates users table', async () => {
    const exists = await db.schema.hasTable('users');
    expect(exists).toBe(true);
  });

  it('creates vaccines table', async () => {
    const exists = await db.schema.hasTable('vaccines');
    expect(exists).toBe(true);
  });

  it('creates inventory table', async () => {
    const exists = await db.schema.hasTable('inventory');
    expect(exists).toBe(true);
  });

  it('creates administrations table', async () => {
    const exists = await db.schema.hasTable('administrations');
    expect(exists).toBe(true);
  });

  it('creates adjustments table', async () => {
    const exists = await db.schema.hasTable('adjustments');
    expect(exists).toBe(true);
  });

  it('creates temperature_logs table', async () => {
    const exists = await db.schema.hasTable('temperature_logs');
    expect(exists).toBe(true);
  });

  it('creates audit_log table', async () => {
    const exists = await db.schema.hasTable('audit_log');
    expect(exists).toBe(true);
  });

  it('creates sessions table', async () => {
    const exists = await db.schema.hasTable('sessions');
    expect(exists).toBe(true);
  });

  it('can insert and query a location', async () => {
    await db('locations').insert({
      name: 'Main Clinic',
      address: '123 Main St',
      is_active: true,
    });
    const rows = await db('locations').where({ name: 'Main Clinic' });
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe('123 Main St');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend
NODE_ENV=test npx vitest run tests/migrations.test.js
# Expected: FAIL — no migrations directory / no tables
```

**Step 3: Create all migration files**

`backend/src/db/migrations/001_create_locations.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('locations', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('address');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('locations');
};
```

`backend/src/db/migrations/002_create_users.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('username').unique();
    t.string('pin_hash');
    t.string('password_hash');
    t.enum('role', ['ma', 'manager', 'admin']).notNullable().defaultTo('ma');
    t.integer('location_id').unsigned().references('id').inTable('locations');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
```

`backend/src/db/migrations/003_create_vaccines.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('vaccines', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('short_name').notNullable();
    t.string('cpt_code');
    t.string('cvx_code');
    t.string('ndc_pattern');
    t.string('manufacturer');
    t.integer('doses_per_vial').defaultTo(1);
    t.integer('min_age_months');
    t.integer('max_age_months');
    t.integer('beyond_use_days');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('vaccines');
};
```

`backend/src/db/migrations/004_create_inventory.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('inventory', (t) => {
    t.increments('id').primary();
    t.integer('vaccine_id').unsigned().notNullable().references('id').inTable('vaccines');
    t.integer('location_id').unsigned().notNullable().references('id').inTable('locations');
    t.string('lot_number').notNullable();
    t.date('expiration_date').notNullable();
    t.string('ndc');
    t.enum('funding_source', ['vfc', 'private']).notNullable();
    t.integer('quantity_received').notNullable();
    t.integer('quantity_remaining').notNullable();
    t.integer('received_by_user_id').unsigned().references('id').inTable('users');
    t.boolean('is_quarantined').defaultTo(false);
    t.timestamp('opened_at');
    t.timestamp('discard_after');
    t.text('notes');
    t.timestamp('received_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('inventory');
};
```

`backend/src/db/migrations/005_create_administrations.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('administrations', (t) => {
    t.increments('id').primary();
    t.integer('inventory_id').unsigned().notNullable().references('id').inTable('inventory');
    t.integer('location_id').unsigned().notNullable().references('id').inTable('locations');
    t.integer('administered_by_user_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('quantity').notNullable().defaultTo(1);
    t.enum('funding_source', ['vfc', 'private']).notNullable();
    t.text('notes');
    t.timestamp('administered_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('administrations');
};
```

`backend/src/db/migrations/006_create_adjustments.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('adjustments', (t) => {
    t.increments('id').primary();
    t.integer('inventory_id').unsigned().notNullable().references('id').inTable('inventory');
    t.enum('adjustment_type', [
      'waste', 'transfer_out', 'transfer_in', 'correction',
      'expired', 'recall', 'borrowing', 'returned',
    ]).notNullable();
    t.integer('quantity').notNullable();
    t.text('reason');
    t.integer('adjusted_by_user_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('related_location_id').unsigned().references('id').inTable('locations');
    t.timestamp('adjusted_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('adjustments');
};
```

`backend/src/db/migrations/007_create_temperature_logs.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('temperature_logs', (t) => {
    t.increments('id').primary();
    t.integer('location_id').unsigned().notNullable().references('id').inTable('locations');
    t.string('unit_name').notNullable();
    t.decimal('reading_f', 5, 1).notNullable();
    t.timestamp('reading_time').defaultTo(knex.fn.now());
    t.integer('logged_by_user_id').unsigned().notNullable().references('id').inTable('users');
    t.boolean('out_of_range').defaultTo(false);
    t.text('notes');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('temperature_logs');
};
```

`backend/src/db/migrations/008_create_audit_log.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('audit_log', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users');
    t.integer('location_id').unsigned().references('id').inTable('locations');
    t.string('action').notNullable();
    t.string('entity_type').notNullable();
    t.integer('entity_id');
    t.json('details');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_log');
};
```

`backend/src/db/migrations/009_create_sessions.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('sessions', (t) => {
    t.string('sid').primary();
    t.json('sess').notNullable();
    t.timestamp('expired');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sessions');
};
```

**Step 4: Run test to verify it passes**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend
NODE_ENV=test npx vitest run tests/migrations.test.js
# Expected: All PASS
```

**Step 5: Run migrations for development database**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend
npx knex migrate:latest --knexfile src/db/knexfile.js
# Expected: Batch 1 run: 9 migrations
```

**Step 6: Commit**

```bash
git add -A
git commit -m "FEATURE: Add database schema with all 9 migration files"
```

---

### Task 4: Seed Data — Vaccine Catalog and Bootstrap Admin

**Files:**
- Create: `backend/src/db/seeds/001_vaccines.js`
- Create: `backend/src/db/seeds/002_bootstrap.js`
- Create: `backend/tests/seeds.test.js`

**Step 1: Write failing test for seed data**

`backend/tests/seeds.test.js`:
```javascript
const knex = require('knex');
const config = require('../src/db/knexfile');

describe('Seed data', () => {
  let db;

  beforeAll(async () => {
    db = knex(config.test);
    await db.migrate.latest();
    await db.seed.run();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('seeds standard pediatric vaccines', async () => {
    const vaccines = await db('vaccines').where({ is_active: true });
    expect(vaccines.length).toBeGreaterThanOrEqual(15);
  });

  it('seeds DTaP vaccine with correct CVX code', async () => {
    const dtap = await db('vaccines').where({ short_name: 'DTaP' }).first();
    expect(dtap).toBeDefined();
    expect(dtap.cvx_code).toBe('20');
    expect(dtap.manufacturer).toBeDefined();
  });

  it('seeds a bootstrap admin user', async () => {
    const admin = await db('users').where({ role: 'admin' }).first();
    expect(admin).toBeDefined();
    expect(admin.name).toBe('System Admin');
  });

  it('seeds a default location', async () => {
    const location = await db('locations').first();
    expect(location).toBeDefined();
    expect(location.name).toBe('Main Clinic');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
NODE_ENV=test npx vitest run tests/seeds.test.js
# Expected: FAIL — no seed files
```

**Step 3: Create vaccine seed file**

`backend/src/db/seeds/001_vaccines.js`:
```javascript
exports.seed = async function (knex) {
  await knex('vaccines').del();

  const vaccines = [
    { name: 'Diphtheria, Tetanus, Pertussis (DTaP)', short_name: 'DTaP', cvx_code: '20', cpt_code: '90700', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 2, max_age_months: 83 },
    { name: 'Inactivated Poliovirus (IPV)', short_name: 'IPV', cvx_code: '10', cpt_code: '90713', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 2, max_age_months: 216 },
    { name: 'Measles, Mumps, Rubella (MMR)', short_name: 'MMR', cvx_code: '03', cpt_code: '90707', manufacturer: 'Merck', doses_per_vial: 10, beyond_use_days: 0, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 216 },
    { name: 'Varicella (VAR)', short_name: 'Varicella', cvx_code: '21', cpt_code: '90716', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 216 },
    { name: 'Hepatitis B (HepB)', short_name: 'HepB', cvx_code: '08', cpt_code: '90744', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 0, max_age_months: 228 },
    { name: 'Hepatitis A (HepA)', short_name: 'HepA', cvx_code: '83', cpt_code: '90633', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 216 },
    { name: 'Haemophilus influenzae type b (Hib)', short_name: 'Hib', cvx_code: '17', cpt_code: '90648', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 2, max_age_months: 59 },
    { name: 'Pneumococcal Conjugate (PCV15)', short_name: 'PCV15', cvx_code: '215', cpt_code: '90677', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 2, max_age_months: 71 },
    { name: 'Pneumococcal Conjugate (PCV20)', short_name: 'PCV20', cvx_code: '216', cpt_code: '90678', manufacturer: 'Pfizer', doses_per_vial: 1, ndc_pattern: '^00005\\d{4}', min_age_months: 2, max_age_months: 71 },
    { name: 'Rotavirus (RV5)', short_name: 'Rotavirus', cvx_code: '116', cpt_code: '90680', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 2, max_age_months: 8 },
    { name: 'Influenza (IIV4) Pediatric', short_name: 'Flu (Peds)', cvx_code: '141', cpt_code: '90686', manufacturer: 'Sanofi Pasteur', doses_per_vial: 10, beyond_use_days: 28, ndc_pattern: '^49281\\d{4}', min_age_months: 6, max_age_months: 35 },
    { name: 'Influenza (IIV4) Standard', short_name: 'Flu (Std)', cvx_code: '150', cpt_code: '90688', manufacturer: 'Sanofi Pasteur', doses_per_vial: 10, beyond_use_days: 28, ndc_pattern: '^49281\\d{4}', min_age_months: 36, max_age_months: 216 },
    { name: 'Meningococcal ACWY (MenACWY)', short_name: 'MenACWY', cvx_code: '114', cpt_code: '90734', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 132, max_age_months: 264 },
    { name: 'Meningococcal B (MenB)', short_name: 'MenB', cvx_code: '162', cpt_code: '90620', manufacturer: 'Pfizer', doses_per_vial: 1, ndc_pattern: '^00005\\d{4}', min_age_months: 120, max_age_months: 264 },
    { name: 'Human Papillomavirus (HPV)', short_name: 'HPV', cvx_code: '165', cpt_code: '90651', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 108, max_age_months: 540 },
    { name: 'Tetanus, Diphtheria, Pertussis (Tdap)', short_name: 'Tdap', cvx_code: '115', cpt_code: '90715', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 84, max_age_months: 780 },
    { name: 'DTaP-IPV-HepB (Pediarix)', short_name: 'Pediarix', cvx_code: '110', cpt_code: '90723', manufacturer: 'GSK', doses_per_vial: 1, ndc_pattern: '^58160\\d{4}', min_age_months: 2, max_age_months: 83 },
    { name: 'DTaP-IPV (Kinrix)', short_name: 'Kinrix', cvx_code: '130', cpt_code: '90696', manufacturer: 'GSK', doses_per_vial: 1, ndc_pattern: '^58160\\d{4}', min_age_months: 48, max_age_months: 83 },
    { name: 'MMR-Varicella (ProQuad)', short_name: 'MMRV', cvx_code: '94', cpt_code: '90710', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 144 },
    { name: 'COVID-19 mRNA (Pfizer, Peds)', short_name: 'COVID (Peds)', cvx_code: '218', cpt_code: '91309', manufacturer: 'Pfizer', doses_per_vial: 1, ndc_pattern: '^59267\\d{4}', min_age_months: 6, max_age_months: 59 },
  ];

  await knex('vaccines').insert(vaccines.map(v => ({ ...v, is_active: true })));
};
```

**Step 4: Create bootstrap seed file**

`backend/src/db/seeds/002_bootstrap.js`:
```javascript
const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  // Only seed if no admin exists
  const existingAdmin = await knex('users').where({ role: 'admin' }).first();
  if (existingAdmin) return;

  // Create default location
  let location = await knex('locations').where({ name: 'Main Clinic' }).first();
  if (!location) {
    const [id] = await knex('locations').insert({
      name: 'Main Clinic',
      address: '123 Main Street',
      is_active: true,
    });
    // SQLite returns the id directly, PG may differ
    location = { id: typeof id === 'number' ? id : id.id };
  }

  // Create admin user (password: admin123 — CHANGE IN PRODUCTION)
  const passwordHash = await bcrypt.hash('admin123', 10);
  const pinHash = await bcrypt.hash('123456', 10);

  await knex('users').insert({
    name: 'System Admin',
    username: 'admin',
    pin_hash: pinHash,
    password_hash: passwordHash,
    role: 'admin',
    location_id: location.id,
    is_active: true,
  });
};
```

**Step 5: Run tests**

```bash
NODE_ENV=test npx vitest run tests/seeds.test.js
# Expected: All PASS
```

**Step 6: Run seeds for development database**

```bash
npx knex seed:run --knexfile src/db/knexfile.js
```

**Step 7: Commit**

```bash
git add -A
git commit -m "FEATURE: Add vaccine catalog seed data (20 peds vaccines) and bootstrap admin"
```

---

## Phase 2: Authentication System

### Task 5: Auth Middleware and Session Setup

**Files:**
- Modify: `backend/src/index.js`
- Create: `backend/src/middleware/auth.js`
- Create: `backend/src/middleware/audit.js`
- Create: `backend/src/routes/auth.js`
- Create: `backend/tests/auth.test.js`

**Step 1: Write failing tests for auth**

`backend/tests/auth.test.js`:
```javascript
const request = require('supertest');
const knex = require('knex');
const config = require('../src/db/knexfile');
const bcrypt = require('bcrypt');

let db;
let app;

beforeAll(async () => {
  db = knex(config.test);
  await db.migrate.latest();
  await db.seed.run();

  // Override the db connection in app
  process.env.NODE_ENV = 'test';
  app = require('../src/app');
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /api/auth/login-pin', () => {
  it('returns 401 for invalid PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login-pin')
      .send({ pin: '999999' });
    expect(res.status).toBe(401);
  });

  it('returns 200 and user info for valid PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login-pin')
      .send({ pin: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('System Admin');
    expect(res.body.user.pin_hash).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 200 for correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Extract Express app to separate module**

`backend/src/app.js`:
```javascript
require('dotenv').config({ path: '../.env' });
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./db/connection');

const authRoutes = require('./routes/auth');

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// Body parsing
app.use(express.json());

// Sessions
const KnexSessionStore = require('connect-session-knex')(session);
const store = new KnexSessionStore({
  knex: db,
  tablename: 'sessions',
  createtable: false,
});

app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// Make db available to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

module.exports = app;
```

Update `backend/src/index.js`:
```javascript
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`VaxInv server running on port ${PORT}`);
});
```

**Step 3: Create auth routes**

`backend/src/routes/auth.js`:
```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// PIN login (MAs)
router.post('/login-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 6) {
    return res.status(400).json({ error: 'PIN must be at least 6 digits' });
  }

  try {
    const users = await req.db('users').where({ is_active: true });
    for (const user of users) {
      if (user.pin_hash && await bcrypt.compare(pin, user.pin_hash)) {
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.locationId = user.location_id;
        const { pin_hash, password_hash, ...safeUser } = user;
        return res.json({ user: safeUser });
      }
    }
    return res.status(401).json({ error: 'Invalid PIN' });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Username/password login (admin/manager)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await req.db('users')
      .where({ username, is_active: true })
      .first();
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.locationId = user.location_id;
    const { pin_hash, password_hash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await req.db('users').where({ id: req.session.userId }).first();
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  const { pin_hash, password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

module.exports = router;
```

**Step 4: Create auth middleware**

`backend/src/middleware/auth.js`:
```javascript
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
```

**Step 5: Create audit middleware**

`backend/src/middleware/audit.js`:
```javascript
async function auditLog(db, { userId, locationId, action, entityType, entityId, details }) {
  await db('audit_log').insert({
    user_id: userId,
    location_id: locationId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: JSON.stringify(details),
  });
}

module.exports = { auditLog };
```

**Step 6: Run tests**

```bash
NODE_ENV=test npx vitest run tests/auth.test.js
# Expected: All PASS
```

**Step 7: Commit**

```bash
git add -A
git commit -m "FEATURE: Add session-based auth with PIN login and username/password login"
```

---

## Phase 3: Core API Routes

### Task 6: Vaccine Catalog API

**Files:**
- Create: `backend/src/routes/vaccines.js`
- Create: `backend/tests/vaccines.test.js`
- Modify: `backend/src/app.js` (add route)

**Step 1: Write failing tests**

`backend/tests/vaccines.test.js`:
```javascript
const request = require('supertest');
const knex = require('knex');
const config = require('../src/db/knexfile');

let db, app, agent;

beforeAll(async () => {
  db = knex(config.test);
  await db.migrate.latest();
  await db.seed.run();
  process.env.NODE_ENV = 'test';
  app = require('../src/app');
  agent = request.agent(app);

  // Login as admin
  await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
});

afterAll(async () => { await db.destroy(); });

describe('GET /api/vaccines', () => {
  it('returns list of active vaccines', async () => {
    const res = await agent.get('/api/vaccines');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(15);
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('cvx_code');
  });
});

describe('POST /api/vaccines', () => {
  it('creates a new vaccine (admin only)', async () => {
    const res = await agent.post('/api/vaccines').send({
      name: 'Test Vaccine', short_name: 'TEST', cvx_code: '999',
      manufacturer: 'TestCo', doses_per_vial: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });
});

describe('PUT /api/vaccines/:id', () => {
  it('updates a vaccine', async () => {
    const res = await agent.put('/api/vaccines/1').send({ manufacturer: 'Updated Mfg' });
    expect(res.status).toBe(200);
    expect(res.body.manufacturer).toBe('Updated Mfg');
  });
});

describe('GET /api/vaccines/match-ndc/:ndc', () => {
  it('matches an NDC to a vaccine', async () => {
    const res = await agent.get('/api/vaccines/match-ndc/492810001');
    expect(res.status).toBe(200);
    // Should match vaccines with ndc_pattern starting with 49281
  });
});
```

**Step 2: Implement vaccine routes**

`backend/src/routes/vaccines.js`:
```javascript
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

// List active vaccines
router.get('/', requireAuth, async (req, res) => {
  const vaccines = await req.db('vaccines').where({ is_active: true }).orderBy('short_name');
  res.json(vaccines);
});

// Match NDC to vaccine
router.get('/match-ndc/:ndc', requireAuth, async (req, res) => {
  const { ndc } = req.params;
  const vaccines = await req.db('vaccines').where({ is_active: true });
  const matches = vaccines.filter(v => {
    if (!v.ndc_pattern) return false;
    try {
      return new RegExp(v.ndc_pattern).test(ndc);
    } catch {
      return false;
    }
  });
  if (matches.length === 0) {
    return res.status(404).json({ error: 'No matching vaccine found', ndc });
  }
  res.json(matches);
});

// Create vaccine (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, short_name, cpt_code, cvx_code, ndc_pattern, manufacturer,
    doses_per_vial, min_age_months, max_age_months, beyond_use_days } = req.body;

  if (!name || !short_name) {
    return res.status(400).json({ error: 'Name and short_name required' });
  }

  const [id] = await req.db('vaccines').insert({
    name, short_name, cpt_code, cvx_code, ndc_pattern, manufacturer,
    doses_per_vial: doses_per_vial || 1, min_age_months, max_age_months,
    beyond_use_days, is_active: true,
  });

  const vaccine = await req.db('vaccines').where({ id }).first();
  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'create', entityType: 'vaccine', entityId: id,
    details: { name, short_name },
  });
  res.status(201).json(vaccine);
});

// Update vaccine (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'short_name', 'cpt_code', 'cvx_code', 'ndc_pattern',
    'manufacturer', 'doses_per_vial', 'min_age_months', 'max_age_months',
    'beyond_use_days', 'is_active'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await req.db('vaccines').where({ id }).update(updates);
  const vaccine = await req.db('vaccines').where({ id }).first();
  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'update', entityType: 'vaccine', entityId: parseInt(id),
    details: updates,
  });
  res.json(vaccine);
});

module.exports = router;
```

**Step 3: Register route in app.js**

Add to `backend/src/app.js` after auth routes:
```javascript
const vaccineRoutes = require('./routes/vaccines');
app.use('/api/vaccines', vaccineRoutes);
```

**Step 4: Run tests, then commit**

```bash
NODE_ENV=test npx vitest run tests/vaccines.test.js
git add -A && git commit -m "FEATURE: Add vaccine catalog API with NDC matching"
```

---

### Task 7: Inventory API (Receiving, Querying, FEFO)

**Files:**
- Create: `backend/src/routes/inventory.js`
- Create: `backend/tests/inventory.test.js`
- Modify: `backend/src/app.js`

**Step 1: Write failing tests**

`backend/tests/inventory.test.js`:
```javascript
const request = require('supertest');
const knex = require('knex');
const config = require('../src/db/knexfile');

let db, app, agent;

beforeAll(async () => {
  db = knex(config.test);
  await db.migrate.latest();
  await db.seed.run();
  process.env.NODE_ENV = 'test';
  app = require('../src/app');
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
});

afterAll(async () => { await db.destroy(); });

describe('POST /api/inventory/receive', () => {
  it('receives new inventory', async () => {
    const res = await agent.post('/api/inventory/receive').send({
      vaccine_id: 1,
      lot_number: 'LOT123',
      expiration_date: '2027-06-15',
      ndc: '49281001001',
      funding_source: 'vfc',
      quantity: 10,
    });
    expect(res.status).toBe(201);
    expect(res.body.quantity_remaining).toBe(10);
    expect(res.body.lot_number).toBe('LOT123');
  });

  it('rejects without required fields', async () => {
    const res = await agent.post('/api/inventory/receive').send({
      vaccine_id: 1,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory', () => {
  it('returns inventory for current location', async () => {
    const res = await agent.get('/api/inventory');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/inventory/fefo/:vaccineId', () => {
  it('returns lots ordered by expiration (FEFO)', async () => {
    // Add a second lot with earlier expiration
    await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'LOT_EARLIER', expiration_date: '2026-12-01',
      ndc: '49281001001', funding_source: 'vfc', quantity: 5,
    });
    const res = await agent.get('/api/inventory/fefo/1');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    // First lot should expire sooner
    expect(new Date(res.body[0].expiration_date) <= new Date(res.body[1].expiration_date)).toBe(true);
  });
});
```

**Step 2: Implement inventory routes**

`backend/src/routes/inventory.js`:
```javascript
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

// Receive inventory
router.post('/receive', requireAuth, async (req, res) => {
  const { vaccine_id, lot_number, expiration_date, ndc, funding_source, quantity, notes } = req.body;

  if (!vaccine_id || !lot_number || !expiration_date || !funding_source || !quantity) {
    return res.status(400).json({ error: 'vaccine_id, lot_number, expiration_date, funding_source, and quantity are required' });
  }
  if (!['vfc', 'private'].includes(funding_source)) {
    return res.status(400).json({ error: 'funding_source must be vfc or private' });
  }

  const locationId = req.session.locationId;
  const [id] = await req.db('inventory').insert({
    vaccine_id, location_id: locationId, lot_number, expiration_date, ndc,
    funding_source, quantity_received: quantity, quantity_remaining: quantity,
    received_by_user_id: req.session.userId, notes,
  });

  const record = await req.db('inventory').where({ id }).first();
  await auditLog(req.db, {
    userId: req.session.userId, locationId, action: 'receive',
    entityType: 'inventory', entityId: id,
    details: { vaccine_id, lot_number, quantity, funding_source },
  });
  res.status(201).json(record);
});

// List inventory for location
router.get('/', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const query = req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .select('inventory.*', 'vaccines.name as vaccine_name', 'vaccines.short_name',
      'vaccines.cvx_code', 'vaccines.doses_per_vial', 'vaccines.beyond_use_days')
    .orderBy('inventory.expiration_date', 'asc');

  if (req.query.funding_source) {
    query.where('inventory.funding_source', req.query.funding_source);
  }
  if (req.query.vaccine_id) {
    query.where('inventory.vaccine_id', req.query.vaccine_id);
  }

  const inventory = await query;
  res.json(inventory);
});

// FEFO for a specific vaccine at current location
router.get('/fefo/:vaccineId', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const inventory = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where({
      'inventory.vaccine_id': req.params.vaccineId,
      'inventory.location_id': locationId,
      'inventory.is_quarantined': false,
    })
    .where('inventory.quantity_remaining', '>', 0)
    .where('inventory.expiration_date', '>', new Date().toISOString().split('T')[0])
    .select('inventory.*', 'vaccines.short_name', 'vaccines.beyond_use_days')
    .orderBy('inventory.expiration_date', 'asc');

  res.json(inventory);
});

// Single inventory record
router.get('/:id', requireAuth, async (req, res) => {
  const record = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.id', req.params.id)
    .select('inventory.*', 'vaccines.name as vaccine_name', 'vaccines.short_name')
    .first();

  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

module.exports = router;
```

**Step 3: Register in app.js, run tests, commit**

```bash
NODE_ENV=test npx vitest run tests/inventory.test.js
git add -A && git commit -m "FEATURE: Add inventory receiving API with FEFO ordering"
```

---

### Task 8: Administration API (Dose Administration)

**Files:**
- Create: `backend/src/routes/administrations.js`
- Create: `backend/tests/administrations.test.js`

Tests cover: administer a dose, decrement quantity_remaining, block expired lots, block quarantined lots, block zero-quantity lots, FEFO warning, multi-dose vial opened_at tracking.

Key logic:
- Decrement `quantity_remaining` atomically
- If multi-dose vial (doses_per_vial > 1) and `opened_at` is null, set `opened_at` and calculate `discard_after` based on `beyond_use_days`
- Block if `expiration_date < today`
- Block if `is_quarantined = true`
- Block if `quantity_remaining <= 0`
- Warn (but allow) if not using the FEFO-recommended lot
- Record in `administrations` table
- Audit log entry

**Commit message:** `FEATURE: Add dose administration API with FEFO enforcement and vial tracking`

---

### Task 9: Adjustments API (Waste, Transfer, Correction, Expired, Recall)

**Files:**
- Create: `backend/src/routes/adjustments.js`
- Create: `backend/tests/adjustments.test.js`

Key flows:

**Waste:** Reduce quantity_remaining, record reason.

**Transfer out/in:** Create `transfer_out` at origin (reduce qty), create `transfer_in` at destination (new inventory record or add to existing lot). Link via `related_location_id`.

**Correction:** Adjust quantity with mandatory reason. Can increase or decrease.

**Expired:** Bulk zero-out all lots past expiration at a location.

**Recall:** Quarantine all inventory matching a lot number across ALL locations.

**Borrowing:** VFC stock out → use private with special documentation.

**Returned:** Track vaccines returned to distributor for credit.

**Commit message:** `FEATURE: Add inventory adjustments API with transfers, recalls, and borrowing`

---

### Task 10: Temperature Logging API

**Files:**
- Create: `backend/src/routes/temperature.js`
- Create: `backend/tests/temperature.test.js`

Key logic:
- Record reading with auto-flagging if outside 36-46°F range
- List readings by location and date range
- Excursion report: all out-of-range readings

**Commit message:** `FEATURE: Add temperature logging API with excursion detection`

---

### Task 11: Locations API

**Files:**
- Create: `backend/src/routes/locations.js`
- Create: `backend/tests/locations.test.js`

CRUD for locations (admin only). List for all authenticated users.

**Commit message:** `FEATURE: Add locations CRUD API`

---

### Task 12: Users API

**Files:**
- Create: `backend/src/routes/users.js`
- Create: `backend/tests/users.test.js`

CRUD for users (admin only). Create with PIN, assign role and location. Reset PIN. Deactivate.

**Commit message:** `FEATURE: Add user management API`

---

### Task 13: Reports API

**Files:**
- Create: `backend/src/routes/reports.js`
- Create: `backend/tests/reports.test.js`

Endpoints:
- `GET /api/reports/inventory` — current stock by location, vaccine, funding source
- `GET /api/reports/administrations` — doses given by date range, vaccine, user
- `GET /api/reports/wastage` — adjustments by type, date range
- `GET /api/reports/temperature` — temp logs with excursion highlighting
- `GET /api/reports/audit` — full audit trail (admin only)
- `GET /api/reports/expiring` — lots expiring within N days
- `GET /api/reports/low-stock` — lots below par level

All endpoints support `?format=csv` query parameter for CSV export.

**Commit message:** `FEATURE: Add reporting API with CSV export`

---

### Task 14: Dashboard API

**Files:**
- Create: `backend/src/routes/dashboard.js`
- Create: `backend/tests/dashboard.test.js`

Single endpoint `GET /api/dashboard` returns:
- `inventory_summary`: count by vaccine, funding source
- `expiring_soon`: lots within 30/60/90 days
- `low_stock`: below configurable par levels
- `recent_activity`: last 20 audit log entries
- `vial_alerts`: opened multi-dose vials approaching discard_after
- `temperature_excursions`: out-of-range readings from last 24h

**Commit message:** `FEATURE: Add dashboard summary API`

---

## Phase 4: Frontend

### Task 15: Scaffold React Frontend

**Files:**
- Create: `frontend/` via Vite scaffold
- Create: `frontend/src/api/client.js` (fetch wrapper)
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/components/Layout.jsx`
- Create: `frontend/tailwind.config.js`

**Step 1: Create Vite project**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv
npm create vite@latest frontend -- --template react
cd frontend && npm install
npm install react-router-dom @tanstack/react-query tailwindcss @tailwindcss/vite
npm install jspdf jspdf-autotable papaparse react-hot-toast
```

**Step 2: Configure Vite proxy for API**

`frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

**Step 3: Create API client**

`frontend/src/api/client.js`:
```javascript
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
```

**Step 4: Create Auth context**

`frontend/src/context/AuthContext.jsx` — provides `user`, `login`, `loginPin`, `logout` to app.

**Step 5: Create Layout with location header, nav, and color-coded funding indicators**

**Step 6: Commit**

```bash
git add -A
git commit -m "FEATURE: Scaffold React frontend with Vite, Tailwind, auth context, and API client"
```

---

### Task 16: Login Screen

**Files:**
- Create: `frontend/src/pages/Login.jsx`

Two modes: PIN pad (large numpad buttons, 48px+ height) and admin login (username/password form). Toggle between them. Auto-focus PIN input field.

**Commit message:** `FEATURE: Add login screen with PIN pad and admin login`

---

### Task 17: Dashboard Page

**Files:**
- Create: `frontend/src/pages/Dashboard.jsx`
- Create: `frontend/src/components/StockSummaryCard.jsx`
- Create: `frontend/src/components/AlertBanner.jsx`
- Create: `frontend/src/components/RecentActivity.jsx`

Shows: inventory summary cards, expiring-soon alerts (yellow/red), low-stock warnings, opened vial alerts, recent activity feed, quick-action buttons (Receive, Administer, Log Temp).

**Commit message:** `FEATURE: Add dashboard with inventory summary, alerts, and quick actions`

---

### Task 18: Receive Inventory Page

**Files:**
- Create: `frontend/src/pages/ReceiveInventory.jsx`
- Create: `frontend/src/components/BarcodeInput.jsx`
- Create: `frontend/src/components/ConfirmReceive.jsx`

Scanner-first flow:
1. Auto-focused barcode input with rapid-input detection
2. On scan → parse NDC → call `/api/vaccines/match-ndc/:ndc`
3. If match: show vaccine name, prompt for lot, exp, quantity, funding source
4. If GS1 2D barcode detected: auto-fill lot and exp from parsed data
5. If no match: allow manual vaccine selection, flag for catalog update
6. VFC = blue background, Private = green background
7. Confirmation screen with all details → commit

`frontend/src/components/BarcodeInput.jsx` key behavior:
- Detects rapid input (< 50ms between keystrokes = scanner)
- Processes on Enter/Tab
- Attempts GS1 parsing first: look for AI `01` (GTIN), `10` (lot), `17` (exp)
- Falls back to raw NDC matching

**Commit message:** `FEATURE: Add inventory receiving page with barcode scanner support`

---

### Task 19: Administer Dose Page

**Files:**
- Create: `frontend/src/pages/AdministerDose.jsx`

Flow:
1. Scan lot barcode OR select vaccine → see FEFO-ordered lot list
2. Select funding source (VFC blue / Private green)
3. FEFO warning if not using oldest lot
4. Block expired/quarantined/empty lots (visual + API enforcement)
5. Confirm → administer → success feedback
6. Multi-dose vial: show opened status, doses remaining, discard_after warning

**Commit message:** `FEATURE: Add dose administration page with FEFO and vial tracking`

---

### Task 20: Adjustments Page

**Files:**
- Create: `frontend/src/pages/Adjustments.jsx`

Tabs: Waste | Transfer | Correction | Expired | Recall | Borrowing | Returned

Each tab has appropriate form. Transfer shows destination location picker. Recall searches by lot number. Expired has bulk action with confirmation.

**Commit message:** `FEATURE: Add inventory adjustments page with all adjustment types`

---

### Task 21: Temperature Logging Page

**Files:**
- Create: `frontend/src/pages/TemperatureLog.jsx`

Simple entry form + daily/weekly table view. Out-of-range readings highlighted in red. Quick date navigation.

**Commit message:** `FEATURE: Add temperature logging page with excursion highlighting`

---

### Task 22: Reports Page

**Files:**
- Create: `frontend/src/pages/Reports.jsx`
- Create: `frontend/src/components/ReportTable.jsx`
- Create: `frontend/src/utils/export.js` (PDF + CSV helpers)

Tabs: Inventory | Administrations | Wastage | Temperature | Audit

Each tab: date range filter, location filter, vaccine filter, funding source filter. Table display with sortable columns. Export buttons for PDF and CSV.

PDF export uses jsPDF + autoTable. CSV export uses papaparse.

**Commit message:** `FEATURE: Add reports page with filtering and PDF/CSV export`

---

### Task 23: Admin Pages (Users, Vaccines, Locations)

**Files:**
- Create: `frontend/src/pages/admin/Users.jsx`
- Create: `frontend/src/pages/admin/Vaccines.jsx`
- Create: `frontend/src/pages/admin/Locations.jsx`

Standard CRUD tables with add/edit modals. Admin-only routes (redirect if role !== admin).

**Commit message:** `FEATURE: Add admin pages for user, vaccine, and location management`

---

### Task 24: Static Asset Serving and Build Pipeline

**Files:**
- Modify: `backend/src/app.js`
- Create: `Dockerfile`

Configure Express to serve the built React app from `frontend/dist/` in production. SPA fallback for client-side routing.

`Dockerfile`:
```dockerfile
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/index.js"]
```

**Commit message:** `FEATURE: Add Dockerfile and static asset serving for production build`

---

## Phase 5: Polish and Deploy

### Task 25: Connection Status Banner

**Files:**
- Create: `frontend/src/components/ConnectionStatus.jsx`

Simple component: periodically pings `/api/health`. If fails, shows red "Connection Lost" banner at top. No offline transactions — just visual indicator.

**Commit message:** `FEATURE: Add connection status indicator`

---

### Task 26: Session Timeout

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx`

Auto-logout after 30 minutes of inactivity. Visual countdown warning at 25 minutes. Reset on any user interaction.

**Commit message:** `FEATURE: Add session timeout with inactivity detection`

---

### Task 27: Backup Script

**Files:**
- Create: `scripts/backup.sh`

PostgreSQL backup script using `pg_dump`. Rotates last 7 daily backups. Designed for cron.

**Commit message:** `FEATURE: Add PostgreSQL backup script`

---

### Task 28: Integration Testing and Final Verification

**Run full test suite, fix any failures.**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv/backend
NODE_ENV=test npx vitest run
```

**Run the full app and verify all flows manually:**

```bash
cd /Users/dochobbs/Downloads/Consult/GIT/vaxinv
npm run dev
# Open http://localhost:5173
# 1. Login with PIN 123456
# 2. Receive inventory (scan or manual)
# 3. Administer dose
# 4. Create adjustment
# 5. Log temperature
# 6. View reports
# 7. Admin: manage users, vaccines, locations
```

**Commit message:** `CHORE: Integration testing and final verification`

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Scaffolding & DB | 1-4 | Repo, monorepo, database, seeds |
| 2: Auth | 5 | PIN + password login, sessions, RBAC |
| 3: Core API | 6-14 | All backend endpoints, business logic |
| 4: Frontend | 15-23 | Complete React UI, scanner workflow |
| 5: Polish | 24-28 | Docker, connection status, backup |

**Total: 28 tasks, ~14 commits for the backend, ~10 for the frontend, ~4 for polish.**
