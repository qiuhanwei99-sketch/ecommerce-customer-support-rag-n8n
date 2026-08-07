import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ingest } from './ingest.mjs';
import {
  PROJECT_ROOT,
  embedText,
  fetchJson,
  getConfig,
  rankChunks,
  readIndex,
} from './core.mjs';

const config = getConfig();
const host = process.env.RAG_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.RAG_PORT || '8787', 10);
const indexPath = path.join(PROJECT_ROOT, 'data', 'index.json');

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': 'http://127.0.0.1:5500',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  response.end(body);
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('Request body is too large.');
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

async function ollamaHealth() {
  try {
    await fetchJson(`${config.ollamaBaseUrl}/api/version`, {}, 3_000);
    return { ok: true, baseUrl: config.ollamaBaseUrl };
  } catch (error) {
    return { ok: false, baseUrl: config.ollamaBaseUrl, error: error.message };
  }
}

async function handle(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': 'http://127.0.0.1:5500',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    const model = await ollamaHealth();
    let index = null;
    try {
      index = await readIndex(indexPath);
    } catch (error) {
      index = { ok: false, error: error.code === 'ENOENT' ? 'index.json is missing; run /ingest first.' : error.message };
    }
    const ok = model.ok && index?.chunkCount > 0;
    sendJson(response, ok ? 200 : 503, { ok, service: 'local-rag-service', ollama: model, index });
    return;
  }

  if (request.method === 'POST' && request.url === '/ingest') {
    try {
      const result = await ingest({ config });
      sendJson(response, 201, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 503, { ok: false, error: `Ollama or ingestion failed: ${error.message}` });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/search') {
    try {
      const body = await readBody(request);
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      if (!query) {
        sendJson(response, 400, { ok: false, error: 'query must be a non-empty string.' });
        return;
      }
      const topK = Number.isInteger(body.topK) ? body.topK : config.topK;
      const index = await readIndex(indexPath);
      const queryEmbedding = await embedText(query, config);
      const results = rankChunks(index.chunks, queryEmbedding, topK, config.minScore, query);
      sendJson(response, 200, {
        ok: true,
        query,
        matched: results.length > 0,
        threshold: config.minScore,
        results,
        indexGeneratedAt: index.generatedAt,
      });
    } catch (error) {
      const status = error.code === 'ENOENT' ? 409 : 503;
      sendJson(response, status, { ok: false, error: `Search unavailable: ${error.message}` });
    }
    return;
  }

  sendJson(response, 404, { ok: false, error: 'Not found.' });
}

export function createRagServer() {
  return http.createServer((request, response) => {
    handle(request, response).catch((error) => sendJson(response, 500, { ok: false, error: error.message }));
  });
}

const isMain = process.argv[1] && pathToFileURL(fileURLToPath(import.meta.url)).href === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const server = createRagServer();
  server.listen(port, host, () => {
    console.log(`RAG service listening on http://${host}:${port}`);
    console.log(`Embedding model: ${config.embeddingModel}`);
  });
}
