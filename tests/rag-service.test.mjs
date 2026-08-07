import test from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, lexicalOverlap, rankChunks, splitMarkdownDocument } from '../services/rag-service/core.mjs';

test('splits Markdown into source-aware chunks', () => {
  const chunks = splitMarkdownDocument('return-policy.md', '# 退货政策\n\n## 退货条件\n\n签收后 7 天内可以申请退货。');
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].source, 'return-policy.md');
  assert.equal(chunks[0].section, '退货条件');
  assert.match(chunks[0].text, /7 天/);
});

test('calculates cosine similarity and ranks matching chunks', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  const results = rankChunks([
    { chunkId: 'a', embedding: [1, 0], source: 'a.md', section: 'A', text: 'A', updatedAt: 'now' },
    { chunkId: 'b', embedding: [0, 1], source: 'b.md', section: 'B', text: 'B', updatedAt: 'now' }
  ], [1, 0], 1, 0.2);
  assert.equal(results.length, 1);
  assert.equal(results[0].chunkId, 'a');
  assert.equal(results[0].score, 1);
});

test('filters low-confidence results so the caller can hand off', () => {
  const results = rankChunks([{ chunkId: 'a', embedding: [1, 0], source: 'a.md', section: 'A', text: 'A', updatedAt: 'now' }], [0, 1], 4, 0.35);
  assert.deepEqual(results, []);
});

test('hybrid retrieval uses meaningful phrase overlap to reduce semantic false positives', () => {
  assert.ok(lexicalOverlap('退货需要满足什么条件', '签收商品后 7 天内可以申请无理由退货') > 0);
  assert.equal(lexicalOverlap('汽车保险', '机器人只能回答店铺商品和退换货政策'), 0);
  const results = rankChunks([
    { chunkId: 'return', embedding: [0.70, 0.71], source: 'return.md', section: '退货', text: '签收商品后 7 天内可以申请无理由退货。', updatedAt: 'now' },
    { chunkId: 'boundary', embedding: [0.72, 0.69], source: 'store.md', section: '边界', text: '机器人只能回答店铺商品和退换货政策。', updatedAt: 'now' }
  ], [0.70, 0.71], 2, 0.36, '退货需要满足什么条件');
  assert.equal(results[0].chunkId, 'return');
  assert.ok(results[0].lexicalScore > 0);
});
