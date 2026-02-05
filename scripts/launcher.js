#!/usr/bin/env node

/**
 * VaxInv Standalone Launcher
 *
 * Entry point compiled by @yao-pkg/pkg into a standalone binary.
 * Handles first-run setup, migrations, seeding, and server start.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const net = require('net');
const { execSync } = require('child_process');

// Determine data directory
// .app mode uses ~/Library/Application Support/VaxInv (set by wrapper script)
// Direct binary mode uses VaxInv-Data/ next to the executable
const dataDir = process.env.VAXINV_DATA_DIR ||
  path.join(path.dirname(process.execPath), 'VaxInv-Data');

// Config file for persisted settings
const configPath = path.join(dataDir, '.vaxinv-config.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }
}

function loadOrCreateConfig() {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  const config = {
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Generated new session secret');
  return config;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

function openBrowser(url) {
  try {
    if (process.platform === 'darwin') {
      execSync(`open "${url}"`);
    } else if (process.platform === 'win32') {
      execSync(`start "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch {
    console.log(`Open your browser to: ${url}`);
  }
}

async function main() {
  const PORT = process.env.PORT || 3000;

  console.log('');
  console.log('========================================');
  console.log('  VaxInv - Vaccine Inventory Manager');
  console.log('========================================');
  console.log('');

  // Check port availability
  const portAvailable = await checkPort(PORT);
  if (!portAvailable) {
    console.error(`ERROR: Port ${PORT} is already in use.`);
    console.error('Another instance of VaxInv may be running.');
    console.error(`To use a different port: PORT=3001 ${process.argv[0]}`);
    process.exit(1);
  }

  // Set up data directory and config
  ensureDataDir();
  const config = loadOrCreateConfig();

  // Set environment variables before requiring app modules
  process.env.NODE_ENV = 'standalone';
  process.env.VAXINV_DATA_DIR = dataDir;
  process.env.SESSION_SECRET = config.sessionSecret;
  process.env.PORT = String(PORT);

  console.log(`Data directory: ${dataDir}`);
  console.log(`Port: ${PORT}`);
  console.log('');

  // Run migrations and seeds
  const knex = require('knex');
  const knexConfig = require('../backend/src/db/knexfile');
  const db = knex(knexConfig.standalone);

  try {
    console.log('Running database migrations...');
    const [batch, migrations] = await db.migrate.latest();
    if (migrations.length > 0) {
      console.log(`  Applied ${migrations.length} migration(s) (batch ${batch})`);
    } else {
      console.log('  Database is up to date');
    }

    console.log('Seeding database...');
    await db.seed.run();
    console.log('  Seeds applied');
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }

  // Start the Express server
  console.log('');
  console.log('Starting server...');
  const app = require('../backend/src/app');

  const server = app.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    console.log('');
    console.log(`VaxInv is running at: ${url}`);
    console.log('Default login: admin / admin123');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
    openBrowser(url);
  });

  // Graceful shutdown
  function shutdown() {
    console.log('\nShutting down VaxInv...');
    server.close(() => {
      console.log('Server stopped. Goodbye!');
      process.exit(0);
    });
    // Force exit after 5 seconds
    setTimeout(() => process.exit(0), 5000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
