// Tiny zero-dependency dev server with live reload.
// Serves the project root and pushes a reload over SSE whenever a file changes.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const RELOAD_SNIPPET = `
<script>
(() => {
  const es = new EventSource('/__reload');
  es.onmessage = () => location.reload();
  es.onerror = () => { es.close(); setTimeout(() => location.reload(), 1200); };
})();
</script>`;

/** @type {Set<import('node:http').ServerResponse>} */
const clients = new Set();

let pending = null;
watch(ROOT, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  if (filename.includes('node_modules') || filename.startsWith('.git')) return;
  if (filename.startsWith('.playwright-mcp')) return;
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const res of clients) res.write('data: reload\n\n');
  }, 60);
});

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 500\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = join(ROOT, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) throw new Error('directory');
    const ext = extname(filePath).toLowerCase();
    const type = TYPES[ext] ?? 'application/octet-stream';
    let body = await readFile(filePath);
    if (ext === '.html') body = Buffer.concat([body, Buffer.from(RELOAD_SNIPPET)]);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><title>Not found</title>
      <body style="font:16px ui-monospace,monospace;background:#101114;color:#e7e9ee;padding:3rem">
      <p>404 — ${pathname}</p>${RELOAD_SNIPPET}`);
  }
}).listen(PORT, () => {
  console.log(`Bulimba Service Centre preview → http://localhost:${PORT}`);
});
