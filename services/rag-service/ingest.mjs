import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  PROJECT_ROOT,
  embedText,
  getConfig,
  splitMarkdownDocument,
} from './core.mjs';

const KNOWLEDGE_DIR = path.join(PROJECT_ROOT, 'data', 'knowledge');
const INDEX_PATH = path.join(PROJECT_ROOT, 'data', 'index.json');

export async function ingest({ knowledgeDir = KNOWLEDGE_DIR, indexPath = INDEX_PATH, config = getConfig() } = {}) {
  const files = (await fs.readdir(knowledgeDir))
    .filter((file) => file.toLowerCase().endsWith('.md'))
    .sort();
  if (files.length === 0) throw new Error(`No Markdown knowledge files found in ${knowledgeDir}`);

  const chunks = [];
  for (const file of files) {
    const fullPath = path.join(knowledgeDir, file);
    const markdown = await fs.readFile(fullPath, 'utf8');
    const stat = await fs.stat(fullPath);
    const fileChunks = splitMarkdownDocument(file, markdown, stat.mtime.toISOString());
    for (const chunk of fileChunks) {
      const embedding = await embedText(chunk.text, config);
      chunks.push({ ...chunk, embedding });
    }
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    embeddingModel: config.embeddingModel,
    chunkCount: chunks.length,
    chunks,
  };
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return { indexPath, fileCount: files.length, chunkCount: chunks.length, embeddingModel: config.embeddingModel };
}

const isMain = process.argv[1] && pathToFileURL(fileURLToPath(import.meta.url)).href === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const result = await ingest();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`INGEST_FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
