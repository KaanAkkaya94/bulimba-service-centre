// Freeze the current site into versions/<slug>/ as a complete, self-contained
// copy, so later changes to the working site can never alter a saved version.
//
//   node snapshot.mjs <slug> "Label shown in the version list"
//
// Each snapshot is a whole site: open it at /versions/<slug>/ or deploy the
// folder on its own.

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const VERSIONS = join(ROOT, 'versions');

const [slug, ...labelParts] = process.argv.slice(2);
const label = labelParts.join(' ');

if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('usage: node snapshot.mjs <slug> "Label"   (slug: lowercase, digits, dashes)');
  process.exit(1);
}

const dest = join(VERSIONS, slug);

if (existsSync(dest)) {
  console.error(`versions/${slug} already exists — pick another slug, or delete it first.`);
  process.exit(1);
}

await mkdir(dest, { recursive: true });
await cp(join(ROOT, 'index.html'), join(dest, 'index.html'));
await cp(join(ROOT, 'assets'), join(dest, 'assets'), { recursive: true });

// Media the live site no longer points at is dead weight inside a snapshot.
const html = await readFile(join(dest, 'index.html'), 'utf8');
for (const dir of ['img', 'video']) {
  const d = join(dest, 'assets', dir);
  if (!existsSync(d)) continue;
  for (const file of await readdir(d)) {
    if (!html.includes(`assets/${dir}/${file}`)) await rm(join(d, file));
  }
}

await writeFile(join(dest, 'VERSION.txt'),
  `${label || slug}\nsaved ${new Date().toISOString()}\n`);

// Rebuild the index of saved versions
const entries = [];
for (const name of (await readdir(VERSIONS)).sort()) {
  const dir = join(VERSIONS, name);
  if (!(await stat(dir)).isDirectory()) continue;
  let title = name, when = '';
  try {
    const [t, w] = (await readFile(join(dir, 'VERSION.txt'), 'utf8')).split('\n');
    title = t || name;
    when = (w || '').replace('saved ', '').slice(0, 16).replace('T', ' ');
  } catch { /* no label file */ }
  entries.push({ name, title, when });
}

await writeFile(join(VERSIONS, 'index.html'), `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bulimba Service Centre — saved versions</title>
<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark }
  body { margin:0; background:#07101E; color:#E8EEF6; padding:clamp(2rem,6vw,5rem);
         font:14px/1.6 "IBM Plex Mono",ui-monospace,monospace }
  h1 { font-family:"Saira Condensed",sans-serif; font-weight:700; text-transform:uppercase;
       font-size:clamp(1.8rem,5vw,2.75rem); letter-spacing:.01em; margin:0 0 .4rem }
  p.sub { color:#5C738F; margin:0 0 2.5rem; text-transform:uppercase; letter-spacing:.18em; font-size:.6875rem }
  ol { list-style:none; margin:0; padding:0; border-top:1px solid #14314E; max-width:46rem }
  li { border-bottom:1px solid #14314E }
  a { display:grid; grid-template-columns:2.5rem 1fr auto; gap:1rem; align-items:baseline;
      padding:1.1rem .6rem 1.1rem 0; color:inherit; text-decoration:none }
  a:hover { background:rgba(53,167,255,.07); padding-left:.6rem }
  .no { color:#1F5584 }
  .ttl { font-family:"Saira Condensed",sans-serif; font-weight:600; text-transform:uppercase;
         font-size:1.125rem; letter-spacing:.02em }
  .when { color:#5C738F; font-size:.6875rem }
  @media (max-width:560px){ a{grid-template-columns:2rem 1fr} .when{display:none} }
</style></head><body>
<h1>Saved versions</h1>
<p class="sub">Bulimba Service Centre · pick one to view</p>
<ol>
${entries.map((e, i) => `  <li><a href="${e.name}/"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="ttl">${e.title}</span><span class="when">${e.when}</span></a></li>`).join('\n')}
</ol>
</body></html>
`);

console.log(`saved versions/${slug}`);
console.log(`view it at  http://localhost:4173/versions/${slug}/`);
console.log(`all versions http://localhost:4173/versions/`);
