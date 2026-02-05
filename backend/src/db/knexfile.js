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
