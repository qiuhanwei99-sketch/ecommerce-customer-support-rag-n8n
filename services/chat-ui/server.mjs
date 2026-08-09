import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const staticRoot = path.join(projectRoot, 'local-chat');
const port = Number.parseInt(process.env.CHAT_UI_PORT || '4173', 10);
const n8nUrl = process.env.N8N_CHAT_URL || 'http://127.0.0.1:5678/webhook/customer-support';
const maxBodyBytes = 1024 * 1024;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(payload);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('请求体超过 1 MB 限制。');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('请求必须是有效的 JSON。');
  }
}

async function proxyChat(request, response) {
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    sendJson(response, 400, { error: '请求必须是 JSON 对象。' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const upstream = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await upstream.text();
    let result;
    try {
      result = JSON.parse(text);
      if (typeof result === 'string') result = JSON.parse(result);
    } catch {
      result = { error: text || 'n8n 返回了无法解析的响应。' };
    }
    if (!upstream.ok) {
      sendJson(response, 502, { error: `n8n 返回 HTTP ${upstream.status}。`, details: result });
      return;
    }
    sendJson(response, 200, result);
  } catch (error) {
    const reason = error.name === 'AbortError'
      ? 'n8n 响应超时，请检查本地服务是否正常。'
      : '无法连接到本地 n8n，请先启动全部服务。';
    sendJson(response, 502, { error: reason, details: error.message });
  } finally {
    clearTimeout(timeout);
  }
}

async function serveStatic(urlPath, response) {
  const requestedPath = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const filePath = path.resolve(staticRoot, `.${requestedPath}`);
  const relative = path.relative(staticRoot, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    sendJson(response, 403, { error: '禁止访问该路径。' });
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(content);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 500;
    sendJson(response, status, { error: status === 404 ? '页面不存在。' : '读取页面失败。' });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true, service: 'local-chat-ui', port, n8nUrl });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/chat') {
    await proxyChat(request, response);
    return;
  }
  if (request.method === 'GET') {
    await serveStatic(url.pathname, response);
    return;
  }
  sendJson(response, 405, { error: '只支持 GET 和 POST。' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local chat UI: http://127.0.0.1:${port}`);
  console.log(`n8n upstream: ${n8nUrl}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
