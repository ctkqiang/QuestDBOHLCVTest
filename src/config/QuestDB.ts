import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

const client = new Client({
  host: import.meta.env.VITE_QDB_HOST || '127.0.0.1',
  port: Number(import.meta.env.VITE_QDB_PORT) || 8812,
  user: import.meta.env.VITE_QDB_USER || 'admin',
  password: import.meta.env.VITE_QDB_PASSWORD || 'quest',
  database: import.meta.env.VITE_QDB_DATABASE || 'qdb',
});

await client.connect();

export const database = drizzle(client);