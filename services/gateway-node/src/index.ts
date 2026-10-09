import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

app.get('/api/incidents', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        title, 
        raw_description, 
        priority, 
        status, 
        ai_severity_score, 
        ST_Y(location::geometry) AS latitude, 
        ST_X(location::geometry) AS longitude, 
        created_at, 
        updated_at 
      FROM incidents 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    res.json({ success: true, incidents: result.rows });
  } catch (err: any) {
    console.error('[Gateway] GET incidents error:', err.message);
    res.status(500).json({ error: 'Failed to fetch incidents', details: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[PulseGrid Gateway] Active and listening on port ${PORT}`);
});
