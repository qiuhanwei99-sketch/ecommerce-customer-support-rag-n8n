import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

test('evaluation set has twenty synthetic questions', async () => {
  const questions = JSON.parse(await fs.readFile(path.join(root, 'data/eval/questions.json'), 'utf8'));
  assert.equal(questions.length, 20);
  assert.ok(questions.every((question) => question.id && question.question && question.expected));
});

test('n8n exports contain expected workflow nodes and no credentials', async () => {
  const customer = JSON.parse(await fs.readFile(path.join(root, 'n8n/customer-support-rag.json'), 'utf8'));
  const names = customer.nodes.map((node) => node.name);
  assert.ok(names.includes('Customer Support Webhook'));
  assert.ok(names.includes('Search Knowledge'));
  assert.ok(names.includes('Ollama Chat Model'));
  assert.ok(names.includes('Respond to Webhook'));
  assert.equal(customer.nodes.some((node) => Object.hasOwn(node, 'credentials')), false);
  const validate = customer.nodes.find((node) => node.name === 'Validate Input');
  const ollama = customer.nodes.find((node) => node.name === 'Ollama Chat Model');
  assert.match(validate.parameters.jsCode, /slice\(-8\)/);
  assert.match(validate.parameters.jsCode, /history contains an invalid message/);
  assert.match(ollama.parameters.body, /\$json\.history/);
});

test('public demo is fixture-backed and does not reference localhost', async () => {
  const app = await fs.readFile(path.join(root, 'demo/app.js'), 'utf8');
  assert.match(app, /fixtures\/responses\.json/);
  assert.doesNotMatch(app, /127\.0\.0\.1|localhost/);
});

test('local chat UI is separate from the public fixture demo', async () => {
  const localPage = await fs.readFile(path.join(root, 'local-chat/index.html'), 'utf8');
  const server = await fs.readFile(path.join(root, 'services/chat-ui/server.mjs'), 'utf8');
  assert.match(localPage, /本机真实模式/);
  assert.match(server, /127\.0\.0\.1/);
  assert.match(server, /\/api\/chat/);
});
