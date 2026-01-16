import { Pool } from 'pg';
import { config } from './config.js';
export const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
});
export async function query(text, params) {
    const res = await pool.query(text, params);
    return { rows: res.rows };
}
