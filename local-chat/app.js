const messages = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#question');
const sendButton = document.querySelector('#send');
const newSessionButton = document.querySelector('#new-session');
const connectionStatus = document.querySelector('#connection-status');

let sessionId = createSessionId();
let history = [];

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    meta.textContent = `意图：${result.intent || 'general'} · ${result.citations?.length ? '知识库来源：' : '未命中知识库'}`;
    for (const citation of result.citations || []) {
      const tag = document.createElement('span');
      tag.className = 'citation';
      tag.textContent = `${citation.source} · ${citation.section}`;
      meta.append(tag);
    }
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

function setBusy(busy) {
  input.disabled = busy;
  sendButton.disabled = busy;
  document.querySelectorAll('[data-question]').forEach((button) => { button.disabled = busy; });
  sendButton.textContent = busy ? '处理中…' : '发送';
}

async function checkHealth() {
  try {
    const response = await fetch('/health');
    if (!response.ok) throw new Error('health failed');
    connectionStatus.textContent = '本地服务已启动';
  } catch {
    connectionStatus.textContent = '本地页面已启动，等待 n8n 服务';
  }
}

async function submitQuestion(question) {
  const value = question.trim();
  if (!value || sendButton.disabled) return;
  const previousHistory = history.slice(-8);
  appendMessage('user', value);
  input.value = '';
  setBusy(true);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, message: value, channel: 'local-ui', history: previousHistory })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || '本地客服服务暂时不可用。');
    const answer = result.answer || '本次没有返回可用答案，请转人工处理。';
    appendMessage('assistant', answer, result);
    history.push({ role: 'user', content: value }, { role: 'assistant', content: answer });
    history = history.slice(-8);
    connectionStatus.textContent = '本地服务已连接';
  } catch (error) {
    appendMessage('assistant', `暂时无法完成请求：${error.message}`);
    connectionStatus.textContent = '连接失败，请检查一键启动窗口';
  } finally {
    setBusy(false);
    input.focus();
  }
}

function resetSession() {
  sessionId = createSessionId();
  history = [];
  messages.replaceChildren();
  appendMessage('assistant', '新会话已开始。你可以问商品、配送、退换货和退款政策；真实订单操作会转人工。');
  input.focus();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitQuestion(input.value);
});
newSessionButton.addEventListener('click', resetSession);
document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => submitQuestion(button.dataset.question)));

checkHealth();
appendMessage('assistant', '你好，我是星河集市客服助手。你可以问商品、配送、退换货和退款政策；真实订单操作会转人工。');
