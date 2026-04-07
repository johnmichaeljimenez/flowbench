import { createClient } from '@libsql/client';
import 'dotenv/config';

const clients = {};

export function getClient(name) {
    const envKey = `DB_${name.toUpperCase()}_URL`;
    const tokenKey = `DB_${name.toUpperCase()}_TOKEN`;

    const url = process.env[envKey];
    const authToken = process.env[tokenKey];

    if (!url) {
        throw new Error(`Environment variable ${envKey} is missing for database "${name}".`);
    }

    if (!clients[name]) {
        clients[name] = createClient({
            url,
            authToken,
        });
        console.log(`✅ Turso client initialized for database: ${name}`);
    }

    return clients[name];
}

export async function query(name, sql, params = []) {
    const db = getClient(name);
    try {
        const result = await db.execute({ sql, args: params });
        return result.rows;
    } catch (err) {
        console.error(`DB Query Error [${name}]:`, err);
        throw err;
    }
}

export async function execute(name, sql, params = []) {
    const db = getClient(name);
    const result = await db.execute({ sql, args: params });
    return { rowsAffected: result.rowsAffected ?? 0 };
}

export async function batchExecute(name, statements) {
    const db = getClient(name);
    try {
        const results = await db.batch(statements, "write");
        return results;
    } catch (err) {
        console.error(`DB Batch Error [${name}]:`, err);
        throw err;
    }
}