import { Pool } from 'pg';
import 'dotenv/config';

// The Pool constructor can directly use the DATABASE_URL environment variable
// if it's available, which is set in our docker-compose.yml.
// For local development outside Docker, it would read from the .env file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Successfully connected to the PostgreSQL database!');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
