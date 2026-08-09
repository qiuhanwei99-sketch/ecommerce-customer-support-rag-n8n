import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = 4317;
const upstreamPort = 4318;
let child;
let upstream;

async function waitForHealth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch { }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('local chat UI did not start in time');
}

test.before(async () => {
  upstream = http.createServer((request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405).end();
      return;
    }
    request.resume();
    request.on('end', () => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ answer: 'mock upstream response', citations: [], handoffRequired: false }));
    });
  });
  await new Promise((resolve) => upstream.listen(upstreamPort, '127.0.0.1', resolve));
  child = spawn(process.execPath, ['services/chat-ui/server.mjs'], {
    cwd: root,
    env: { ...process.env, CHAT_UI_PORT: String(port), N8N_CHAT_URL: `http://127.0.0.1:${upstreamPort}/mock` },
    stdio: 'ignore'
  });
  await waitForHealth();
});

test.after(() => {
  child?.kill();
  upstream?.close();
});

test('local chat UI serves the page and validates JSON requests', async () => {
  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /本机真实模式/);

  const invalid = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid json'
  });
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /JSON/);

  const forwarded = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: 'test-session', message: '测试转发', history: [] })
  });
  assert.equal(forwarded.status, 200);
  assert.equal((await forwarded.json()).answer, 'mock upstream response');
});
