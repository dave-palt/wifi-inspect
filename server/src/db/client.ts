// @ts-ignore - postgres types issue in this environment
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/camdetect';

// @ts-ignore - postgres types issue in this environment
const pool = postgres(DATABASE_URL);

export const db = {
  query: async (text: string, params?: unknown[]): Promise<any[]> => {
    // @ts-ignore
    const result = await pool.query(text, params);
    return result.rows;
  },
  
  queryOne: async (text: string, params?: unknown[]): Promise<any | null> => {
    // @ts-ignore
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  },
  
  execute: async (text: string, params?: unknown[]): Promise<number> => {
    // @ts-ignore
    const result = await pool.query(text, params);
    return result.rowCount || 0;
  },
  
  getClient: () => pool,
};

export async function testConnection(): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export default db;
