import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const textExtensions = new Set(['.md', '.json', '.mjs', '.js', '.html', '.css', '.svg', '.txt']);
const ignoredDirectories = new Set(['.git', 'node_modules', '.npm-cache', '.npm-cache-official', '.npm-cache-sqlite-diag']);
const mojibakeMarkers = /[閫浣鐭瀹鏀锛€鈥鐢у姟绛嗙爜]/;
const gbk = new TextDecoder('gbk');

async function walk(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...await walk(path.join(dir, entry.name)));
    } else if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

for (const file of await walk(root)) {
  if (path.basename(file) === 'repair-text-encoding.mjs') continue;
  const original = await fs.readFile(file, 'utf8');
  if (!mojibakeMarkers.test(original)) continue;
  const repaired = gbk.decode(new TextEncoder().encode(original));
  if (repaired !== original) await fs.writeFile(file, repaired, 'utf8');
}

const workflowPath = path.join(root, 'n8n', 'customer-support-rag.json');
const workflow = JSON.parse(await fs.readFile(workflowPath, 'utf8'));
const promptNode = workflow.nodes.find((node) => node.name === 'Build Grounded Prompt');
if (promptNode) {
  promptNode.parameters.jsCode = [
    "const request = $('Validate Input').first().json;",
    'const search = $json;',
    "const context = (search.results || []).map((item) => `[${item.source} / ${item.section} / ${item.chunkId}]\\n${item.text}`).join('\\n\\n');",
    "const system = '\\u4f60\\u662f\\u661f\\u6cb3\\u96c6\\u5e02\\u5ba2\\u670d\\u673a\\u5668\\u4eba\\u3002\\u53ea\\u80fd\\u4f9d\\u636e\\u63d0\\u4f9b\\u7684\\u77e5\\u8bc6\\u5e93\\u56de\\u7b54\\u3002\\u8d44\\u6599\\u4e0d\\u8db3\\u65f6\\u5fc5\\u987b\\u660e\\u786e\\u8bf4\\u660e\\uff0c\\u4e0d\\u5f97\\u731c\\u6d4b\\u8ba2\\u5355\\u3001\\u5e93\\u5b58\\u3001\\u7269\\u6d41\\u6216\\u9000\\u6b3e\\u7ed3\\u679c\\u3002\\u6d89\\u53ca\\u771f\\u5b9e\\u8ba2\\u5355\\u3001\\u5730\\u5740\\u3001\\u652f\\u4ed8\\u3001\\u4e89\\u8bae\\u9000\\u6b3e\\u3001\\u8d26\\u6237\\u5b89\\u5168\\u6216\\u7528\\u6237\\u8981\\u6c42\\u4eba\\u5de5\\u65f6\\u5fc5\\u987b\\u5efa\\u8bae\\u8f6c\\u4eba\\u5de5\\u3002\\u56de\\u7b54\\u4f7f\\u7528\\u7b80\\u6d01\\u4e2d\\u6587\\u3002';",
    "const prompt = `\\u7528\\u6237\\u95ee\\u9898\\uff1a${request.message}\\n\\n\\u77e5\\u8bc6\\u5e93\\u8d44\\u6599\\uff1a\\n${context}\\n\\n\\u8bf7\\u7ed9\\u51fa\\u5ba2\\u670d\\u56de\\u7b54\\uff0c\\u5e76\\u5728\\u5fc5\\u8981\\u65f6\\u8bf4\\u660e\\u9700\\u8981\\u4eba\\u5de5\\u5904\\u7406\\u3002`;",
    'return [{ json: { ...request, search, system, prompt } }];'
  ].join('\n');
}
await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log('TEXT_ENCODING_REPAIRED');
