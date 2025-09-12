// Express proxy server for Cloudflare DNS management
// Loads Cloudflare API token from root .env, exposes REST endpoints for the client

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const dotenv = require('dotenv');
const compression = require('compression');

// Load environment from root .env (one level up from /server)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));
app.use(compression());

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!CLOUDFLARE_API_TOKEN) {
  console.warn('[WARN] CLOUDFLARE_API_TOKEN is not set. API calls will fail.');
}

// Preconfigured axios instance for Cloudflare API
const cf = axios.create({
  baseURL: 'https://api.cloudflare.com/client/v4',
  headers: {
    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 20000
});

// 简单内存缓存（TTL），用于加速 zones 与 dns_records 查询
const CACHE_TTL_MS = Number(process.env.CF_CACHE_TTL_MS || 60000);
const cache = new Map(); // key -> { ts, data }
const now = () => Date.now();
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (now() - hit.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return hit.data;
}
function cacheSet(key, data) {
  cache.set(key, { ts: now(), data });
}
function invalidateZone(zoneId) {
  const prefix = `dns:${zoneId}:`;
  for (const k of Array.from(cache.keys())) {
    if (k === 'zones' || k.startsWith(prefix)) cache.delete(k);
  }
}

// GET /api/zones -> Cloudflare /zones
app.get('/api/zones', async (req, res, next) => {
  try {
    const key = 'zones';
    const hit = cacheGet(key);
    if (hit) {
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=60');
      return res.json(hit);
    }
    const { data } = await cf.get('/zones');
    cacheSet(key, data);
    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=60');
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/zones/:zoneId/dns_records -> Cloudflare /zones/{zoneId}/dns_records
app.get('/api/zones/:zoneId/dns_records', async (req, res, next) => {
  const { zoneId } = req.params;
  try {
    const key = `dns:${zoneId}:${JSON.stringify(req.query || {})}`;
    const hit = cacheGet(key);
    if (hit) {
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=60');
      return res.json(hit);
    }
    const { data } = await cf.get(`/zones/${encodeURIComponent(zoneId)}/dns_records`, { params: req.query });
    cacheSet(key, data);
    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=60');
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/zones/:zoneId/dns_records -> Cloudflare /zones/{zoneId}/dns_records
app.post('/api/zones/:zoneId/dns_records', async (req, res, next) => {
  const { zoneId } = req.params;
  try {
    const { data } = await cf.post(`/zones/${encodeURIComponent(zoneId)}/dns_records`, req.body);
    invalidateZone(zoneId);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/zones/:zoneId/dns_records/:recordId -> Cloudflare /zones/{zoneId}/dns_records/{recordId}
app.put('/api/zones/:zoneId/dns_records/:recordId', async (req, res, next) => {
  const { zoneId, recordId } = req.params;
  try {
    const { data } = await cf.put(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, req.body);
    invalidateZone(zoneId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/zones/:zoneId/dns_records/:recordId -> Cloudflare /zones/{zoneId}/dns_records/{recordId}
app.delete('/api/zones/:zoneId/dns_records/:recordId', async (req, res, next) => {
  const { zoneId, recordId } = req.params;
  try {
    const { data } = await cf.delete(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`);
    invalidateZone(zoneId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Global error handler to surface Cloudflare errors cleanly
app.use((err, req, res, _next) => {
  if (err.response) {
    // Cloudflare error or upstream error with response
    const { status, data } = err.response;
    return res.status(status).json({ error: true, status, data });
  }
  console.error(err);
  res.status(500).json({ error: true, message: err.message || 'Internal Server Error' });
});

// Optionally serve built client as static files in production
// This enables single-container deployment: API and UI from one origin
try {
  const staticDir = path.resolve(__dirname, '../client/dist');
  app.use(express.static(staticDir));
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} catch (_) {
  // ignore if path not found during dev
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});
