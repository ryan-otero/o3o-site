const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const TEMPLATE_FILE = path.join(__dirname, 'docs', 'template.html');
const OUTPUT_HTML = path.join(__dirname, 'docs', 'index.html');
const OUTPUT_JSON = path.join(__dirname, 'docs', 'content.json');
const CONTENT_TYPES = ['think', 'learn', 'build', 'refs'];

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseContentFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/---PUBLISH BLOCK---([\s\S]*?)---END---/);
  if (!match) return null;

  const block = match[1].trim();
  const lines = block.split('\n');
  const entry = { type: null, title: null, tag: null, date: null, body: '', url: null };
  let inBody = false;

  for (const line of lines) {
    if (inBody) {
      entry.body += (entry.body ? '\n' : '') + line;
      continue;
    }
    if (line.startsWith('TYPE:'))        { entry.type  = line.slice(5).trim();  continue; }
    if (line.startsWith('TITLE:'))       { entry.title = line.slice(6).trim();  continue; }
    if (line.startsWith('NAME:'))        { entry.title = line.slice(5).trim();  continue; }
    if (line.startsWith('TAG/SECTION:')) { entry.tag   = line.slice(12).trim(); continue; }
    if (line.startsWith('TAG:'))         { entry.tag   = line.slice(4).trim();  continue; }
    if (line.startsWith('NOTE:'))        { entry.tag   = line.slice(5).trim();  continue; }
    if (line.startsWith('DATE:'))        { entry.date  = line.slice(5).trim();  continue; }
    if (line.startsWith('URL:'))         { entry.url   = line.slice(4).trim();  continue; }
    if (line.startsWith('BODY:'))        { entry.body  = line.slice(5).trim();  inBody = true; continue; }
  }

  return entry;
}

function loadAllContent() {
  const entries = [];
  for (const type of CONTENT_TYPES) {
    const dir = path.join(CONTENT_DIR, type);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'));
    for (const file of files) {
      const entry = parseContentFile(path.join(dir, file));
      if (entry) entries.push(entry);
    }
  }
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  return entries;
}

// ─── Build ────────────────────────────────────────────────────────────────────

function build() {
  const all = loadAllContent();

  const manifest = {
    think:       all.filter(e => e.type === 'think'),
    build:       all.filter(e => e.type === 'build'),
    foundations: all.filter(e => e.type === 'learn' && e.tag === 'foundations'),
    applied:     all.filter(e => e.type === 'learn' && e.tag === 'applied'),
    refs:        all.filter(e => e.type === 'refs' || e.type === 'ref'),
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(manifest, null, 2), 'utf8');

  // Copy template → index.html (template never changes; content flows through JSON)
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error('template.html not found in docs/');
    process.exit(1);
  }
  fs.copyFileSync(TEMPLATE_FILE, OUTPUT_HTML);

  console.log('Built → docs/content.json + docs/index.html');
  console.log(`  think:       ${manifest.think.length} entries`);
  console.log(`  build:       ${manifest.build.length} entries`);
  console.log(`  foundations: ${manifest.foundations.length} entries`);
  console.log(`  applied:     ${manifest.applied.length} entries`);
  console.log(`  refs:        ${manifest.refs.length} entries`);
}

build();
