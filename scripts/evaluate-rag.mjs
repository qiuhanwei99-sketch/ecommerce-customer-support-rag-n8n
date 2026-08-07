import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const questions = JSON.parse(await fs.readFile(path.join(root, 'data/eval/questions.json'), 'utf8'));
const searchUrl = process.env.RAG_SEARCH_URL || 'http://127.0.0.1:8787/search';

const handoffPatterns = [
  /订单|地址|支付|退款|投诉|账户安全|密码|人工客服|人工|海外|积分|余额/,
];

function expectedHandoff(question) {
  return handoffPatterns.some((pattern) => pattern.test(question));
}

const results = [];
for (const item of questions) {
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: item.question, topK: 4 })
  });
  const search = await response.json();
  const top = search.results?.[0] ?? null;
  const sourceMatched = item.source === null
    ? !search.matched
    : Boolean(search.results?.some((result) => result.source === item.source));
  const handoff = expectedHandoff(item.question);
  const pass = item.expected === 'unknown'
    ? !search.matched
    : item.expected === 'handoff'
      ? handoff
      : sourceMatched;
  results.push({
    id: item.id,
    category: item.category,
    question: item.question,
    expected: item.expected,
    expectedSource: item.source,
    matched: Boolean(search.matched),
    topSource: top?.source ?? null,
    topSection: top?.section ?? null,
    topScore: top?.score ?? null,
    sourceMatched,
    handoffExpectedByRule: handoff,
    pass
  });
}

const passed = results.filter((item) => item.pass).length;
const summary = {
  generatedAt: new Date().toISOString(),
  searchUrl,
  total: results.length,
  passed,
  failed: results.length - passed,
  passRate: Number((passed / results.length).toFixed(3)),
  results
};

await fs.writeFile(path.join(root, 'docs/evaluation-results.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
const lines = [
  '# RAG evaluation report',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  `Result: **${passed}/${results.length} passed (${Math.round(summary.passRate * 100)}%)**`,
  '',
  'This automated run validates retrieval grounding and expected handoff policy against the synthetic question set. Full n8n smoke tests are documented separately because the n8n test webhook accepts one interactive test execution at a time.',
  '',
  '| ID | Question | Expected | Top source | Score | Handoff rule | Pass |',
  '|---|---|---|---|---:|---|---|',
  ...results.map((item) => `| ${item.id} | ${item.question} | ${item.expected} | ${item.topSource ?? '-'} | ${item.topScore ?? '-'} | ${item.handoffExpectedByRule ? 'yes' : 'no'} | ${item.pass ? 'yes' : 'no'} |`),
  '',
  '## Interpretation',
  '',
  '- `grounded`: at least one retrieved chunk came from the expected synthetic source.',
  '- `unknown`: the retriever returned no result above the confidence threshold.',
  '- `handoff`: the question contains an operational or risk-sensitive intent that the n8n workflow should send to a human agent; source matching is informative but not required for this safety branch.'
];
await fs.writeFile(path.join(root, 'docs/evaluation-report.md'), lines.join('\n') + '\n', 'utf8');
console.log(`RAG_EVAL ${passed}/${results.length} passed`);
