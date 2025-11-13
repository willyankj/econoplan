// backend/pg-migrate-config.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: './.env' });

module.exports = {
  databaseUrl: `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.POSTGRES_DB}`,
  dir: 'src/database/migrations',
  migrationsTable: 'pgmigrations',
  direction: 'up',
  count: Infinity,
  checkOrder: false,
};
