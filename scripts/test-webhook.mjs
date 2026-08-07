const messages = {
  return: '\u9000\u8d27\u9700\u8981\u6ee1\u8db3\u4ec0\u4e48\u6761\u4ef6\uff1f',
  handoff: '\u8bf7\u5e2e\u6211\u67e5\u8be2\u8ba2\u5355\u73b0\u5728\u5230\u54ea\u91cc\u4e86\uff1f',
  unknown: '\u4f60\u4eec\u5356\u6c7d\u8f66\u4fdd\u9669\u5417\uff1f'
};
const mode = process.argv[2] || 'return';
if (!messages[mode]) throw new Error(`Unknown test mode: ${mode}. Use return, handoff, or unknown.`);

const payload = {
  sessionId: 'demo-session-001',
  message: messages[mode],
  channel: 'local'
};

const response = await fetch('http://127.0.0.1:5678/webhook-test/customer-support', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload)
});

console.log(`HTTP ${response.status}`);
console.log(await response.text());
