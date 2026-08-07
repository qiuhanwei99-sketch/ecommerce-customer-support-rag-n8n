import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const requiredFiles = [
  'AGENTS.md', 'CLAUDE.md', 'README.md', '.env.example', 'n8n/customer-support-rag.json',
  'n8n/knowledge-ingest.json', 'demo/index.html', 'demo/app.js', 'demo/fixtures/responses.json',
  'services/rag-service/core.mjs', 'services/rag-service/ingest.mjs', 'services/rag-service/server.mjs',
  'data/eval/questions.json'
];
const secretPatterns = [
  /sk-[A-Za-z0-9]{16,}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /xox[baprs]-[0-9A-Za-z-]{12,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /-----BEGIN (?:RSA|OPENSSH|EC|DSA) PRIVATE KEY-----/
];

async function walk(dir) {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.npm-cache', '.npm-cache-official', '.npm-cache-sqlite-diag'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else result.push(full);
  }
  return result;
}

async function assertRequiredFiles() {
  for (const relative of requiredFiles) {
    await fs.access(path.join(root, relative));
  }
}

async function validateData() {
  const knowledge = (await fs.readdir(path.join(root, 'data', 'knowledge'))).filter((file) => file.endsWith('.md'));
  if (knowledge.length < 7) throw new Error(`Expected at least 7 knowledge files, found ${knowledge.length}.`);
  const questions = JSON.parse(await fs.readFile(path.join(root, 'data', 'eval', 'questions.json'), 'utf8'));
  if (questions.length < 20) throw new Error(`Expected at least 20 evaluation questions, found ${questions.length}.`);
}

async function validateWorkflows() {
  for (const filename of ['n8n/customer-support-rag.json', 'n8n/knowledge-ingest.json']) {
    const workflow = JSON.parse(await fs.readFile(path.join(root, filename), 'utf8'));
    if (!workflow.name || !Array.isArray(workflow.nodes) || !workflow.connections) throw new Error(`${filename} is not a valid n8n export shape.`);
    if (workflow.nodes.some((node) => !node.name || !node.type)) throw new Error(`${filename} contains an incomplete node.`);
  }
}

async function validateSyntax() {
  const files = (await walk(root)).filter((file) => /\.(mjs|js)$/.test(file));
  for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

async function scanSecrets() {
  const files = (await walk(root)).filter((file) => !file.endsWith('check-project.mjs'));
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8').catch(() => '');
    for (const pattern of secretPatterns) if (pattern.test(content)) throw new Error(`Secret-like value found in ${path.relative(root, file)}.`);
  }
}

await assertRequiredFiles();
await validateData();
await validateWorkflows();
await validateSyntax();
await scanSecrets();
console.log('PROJECT_CHECK_OK');
