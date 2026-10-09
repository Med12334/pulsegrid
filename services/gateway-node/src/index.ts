import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import Redis from 'ioredis';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

wss.on('connection', (ws: WebSocket) => {
  console.log('[WebSocket] Dispatcher client connected');
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'PulseGrid Live Stream Active' }));
});

function broadcastIncident(incident: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'NEW_INCIDENT', data: incident }));
    }
  });
}

app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    const redisPing = await redis.ping();
    res.json({
      status: 'healthy',
      service: 'gateway-node',
      database: dbRes.rows[0].now ? 'connected' : 'disconnected',
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected'
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.post('/api/incidents', async (req: Request, res: Response) => {
  const { title, raw_description, priority, latitude, longitude } = req.body;

  if (!title || !raw_description || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required incident fields' });
  }

  try {
    const insertQuery = `
      INSERT INTO incidents (title, raw_description, priority, location)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
      RETURNING id, title, raw_description, priority, status, 
                ST_Y(location::geometry) AS latitude, 
                ST_X(location::geometry) AS longitude, 
                created_at;
    `;
    const values = [title, raw_description, priority || 'MEDIUM', longitude, latitude];
    const result = await pool.query(insertQuery, values);
    const incident = result.rows[0];

    await redis.xadd(
      'incident_stream',
      '*',
      'incident_id', incident.id,
      'description', incident.raw_description,
      'priority', incident.priority
    );

    broadcastIncident(incident);

    return res.status(201).json({ success: true, incident });
  } catch (err: any) {
    console.error('Error ingesting incident:', err);
    return res.status(500).json({ error: 'Database ingestion failure', details: err.message });
  }
});

app.get('/api/incidents/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusMeters = parseFloat(req.query.radius as string) || 10000;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params required' });
  }

  try {
    const query = `
      SELECT id, title, raw_description, priority, status,
             ST_Y(location::geometry) AS latitude,
             ST_X(location::geometry) AS longitude,
             ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
      FROM incidents
      WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY distance_meters ASC;
    `;
    const result = await pool.query(query, [lng, lat, radiusMeters]);
    return res.json({ count: result.rows.length, incidents: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Spatial search failure', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[PulseGrid Gateway] Active and listening on port ${PORT}`);
});
