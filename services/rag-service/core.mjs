import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
export const DEFAULT_EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
export const DEFAULT_TOP_K = 4;
export const DEFAULT_MIN_SCORE = 0.42;
const QUERY_STOPWORDS = new Set(['什么', '怎么', '如何', '可以', '能否', '是否', '有没有', '需要', '请问', '帮我', '一下', '多少', '哪里', '哪个', '你们', '我们']);

export function getConfig(env = process.env) {
  return {
    ollamaBaseUrl: (env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, ''),
    embeddingModel: env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
    topK: Number.parseInt(env.TOP_K || String(DEFAULT_TOP_K), 10),
    minScore: Number.parseFloat(env.MIN_SCORE || String(DEFAULT_MIN_SCORE)),
  };
}

export function splitMarkdownDocument(source, markdown, updatedAt = new Date().toISOString(), maxChars = 650) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const chunks = [];
  let section = '文档简介';
  let paragraphs = [];
  let sequence = 0;

  const flush = () => {
    const text = paragraphs.join('\n').trim();
    paragraphs = [];
    if (!text) return;

    const pieces = [];
    for (let start = 0; start < text.length; start += maxChars) {
      pieces.push(text.slice(start, start + maxChars));
    }
    for (const piece of pieces) {
      sequence += 1;
      const safeSource = source.replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      chunks.push({
        chunkId: `${safeSource}-${String(sequence).padStart(2, '0')}`,
        source,
        section,
        text: `来源：${source}\n章节：${section}\n${piece}`,
        updatedAt,
      });
    }
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flush();
      section = heading[1].trim();
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    paragraphs.push(line.trim());
  }
  flush();
  return chunks;
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    const a = Number(left[i]) || 0;
    const b = Number(right[i]) || 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function lexicalTokens(text) {
  const normalized = String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const tokens = new Set();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    const token = normalized.slice(index, index + 2);
    if (!QUERY_STOPWORDS.has(token)) tokens.add(token);
  }
  return tokens;
}

export function lexicalOverlap(query, text) {
  const queryTokens = lexicalTokens(query);
  const textTokens = lexicalTokens(text);
  if (queryTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of queryTokens) if (textTokens.has(token)) overlap += 1;
  return overlap / queryTokens.size;
}

export function rankChunks(chunks, queryEmbedding, topK = DEFAULT_TOP_K, minScore = DEFAULT_MIN_SCORE, queryText = '') {
  return chunks
    .map((chunk) => {
      const semanticScore = cosineSimilarity(chunk.embedding, queryEmbedding);
      const lexicalScore = lexicalOverlap(queryText, chunk.text);
      const score = semanticScore + lexicalScore * 0.25;
      return { ...chunk, score, semanticScore, lexicalScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK))
    .filter((chunk) => chunk.score >= minScore)
    .map(({ embedding, ...chunk }) => ({
      ...chunk,
      score: Number(chunk.score.toFixed(4)),
      semanticScore: Number(chunk.semanticScore.toFixed(4)),
      lexicalScore: Number(chunk.lexicalScore.toFixed(4)),
    }));
}

export function extractEmbedding(payload) {
  if (Array.isArray(payload?.embedding)) return payload.embedding;
  if (Array.isArray(payload?.embeddings?.[0])) return payload.embeddings[0];
  if (Array.isArray(payload?.embeddings)) return payload.embeddings;
  throw new Error('Ollama response did not contain an embedding array.');
}

export async function fetchJson(url, options = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}: ${JSON.stringify(payload)}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function embedText(text, config = getConfig()) {
  const payload = await fetchJson(`${config.ollamaBaseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: config.embeddingModel, input: text }),
  });
  return extractEmbedding(payload);
}

export async function readIndex(indexPath = path.join(PROJECT_ROOT, 'data', 'index.json')) {
  const raw = await fs.readFile(indexPath, 'utf8');
  return JSON.parse(raw);
}
