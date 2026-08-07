const messages = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#question');
let fixtures = [];

const fallbackFixtures = [
  { keywords: ['退货', '无理由'], answer: '签收商品后 7 天内可以申请无理由退货。商品应保持未使用、未损坏，并保留完整包装、配件和赠品。', intent: 'return_policy', citations: [{ source: 'return-policy.md', section: '退货条件', chunkId: 'return-policy-02' }], handoffRequired: false },
  { keywords: ['包邮', '运费'], answer: '演示店铺满 99 元包邮，不满 99 元的订单以结算页显示的运费为准。', intent: 'shipping_policy', citations: [{ source: 'shipping-policy.md', section: '运费', chunkId: 'shipping-policy-03' }], handoffRequired: false },
  { keywords: ['订单', '物流', '地址'], answer: '这个操作需要查询或修改真实订单信息，演示机器人无法直接处理。请转人工客服，并准备好订单号和问题描述。', intent: 'order_service', citations: [{ source: 'escalation-policy.md', section: '必须转人工的情况', chunkId: 'escalation-policy-01' }], handoffRequired: true, handoffReason: '真实订单和地址操作需要人工处理。' },
  { keywords: [], answer: '当前演示知识库没有足够信息支持这个问题。为了避免误导你，建议转人工客服进一步确认。', intent: 'unknown', citations: [], handoffRequired: true, handoffReason: '演示知识库未覆盖该问题。' }
];

async function loadFixtures() {
  try {
    const response = await fetch('fixtures/responses.json');
    if (!response.ok) throw new Error('fixture fetch failed');
    fixtures = await response.json();
  } catch {
    fixtures = fallbackFixtures;
  }
}

function findResponse(question) {
  const match = fixtures.find((fixture) => fixture.keywords.some((keyword) => question.includes(keyword)));
  return match || fixtures.find((fixture) => fixture.keywords.length === 0) || fallbackFixtures.at(-1);
}

function appendMessage(role, text, result = null) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  if (result) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `意图：${result.intent} · 来源：${result.citations.length ? '' : '未命中知识库'}`;
    result.citations.forEach((citation) => {
      const tag = document.createElement('span');
      tag.className = 'citation';
      tag.textContent = `${citation.source} · ${citation.section}`;
      meta.append(tag);
    });
    bubble.append(meta);
    if (result.handoffRequired) {
      const handoff = document.createElement('div');
      handoff.className = 'handoff';
      handoff.textContent = `人工转接：${result.handoffReason || '需要人工确认。'}`;
      bubble.append(handoff);
    }
  }
  wrapper.append(bubble);
  messages.append(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

async function submitQuestion(question) {
  const value = question.trim();
  if (!value) return;
  appendMessage('user', value);
  input.value = '';
  await new Promise((resolve) => setTimeout(resolve, 220));
  const result = findResponse(value);
  appendMessage('assistant', result.answer, result);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitQuestion(input.value);
});
document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => submitQuestion(button.dataset.question)));

await loadFixtures();
appendMessage('assistant', '你好，我是星河集市客服助手。你可以问商品、配送、退换货和退款政策；真实订单操作会转人工。');
