import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'app-state.json');
const PORT = Number(process.env.PORT || 4000);

const emptyState = {
  trades: [],
  accounts: [{ id: '1', name: 'Default Account' }],
  selectedAccountId: '1',
  strategies: [],
  folders: ['Daily Journal', 'Trade Notes', 'Strategy Notes', 'Other'],
  notes: []
};

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, 'utf8');
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(emptyState, null, 2));
  }
}

async function readState() {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, 'utf8');
  return { ...emptyState, ...JSON.parse(raw || '{}') };
}

async function writeState(state) {
  await ensureDataFile();
  const cleanState = {
    trades: Array.isArray(state.trades) ? state.trades : [],
    accounts: Array.isArray(state.accounts) && state.accounts.length ? state.accounts : emptyState.accounts,
    selectedAccountId: state.selectedAccountId || '1',
    strategies: Array.isArray(state.strategies) ? state.strategies : [],
    folders: Array.isArray(state.folders) && state.folders.length ? state.folders : emptyState.folders,
    notes: Array.isArray(state.notes) ? state.notes : []
  };
  await writeFile(DATA_FILE, JSON.stringify(cleanState, null, 2));
  return cleanState;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    if (req.url === '/api/health' && req.method === 'GET') return sendJson(res, 200, { ok: true });
    if (req.url === '/api/state' && req.method === 'GET') return sendJson(res, 200, await readState());
    if (req.url === '/api/state' && req.method === 'PUT') {
      const body = await readBody(req);
      return sendJson(res, 200, await writeState(JSON.parse(body || '{}')));
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Alpha backend listening on http://localhost:${PORT}`);
});
