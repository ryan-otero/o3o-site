const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const TEMPLATE_FILE = path.join(__dirname, 'docs', 'template.html');
const OUTPUT_FILE = path.join(__dirname, 'docs', 'index.html');
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

// ─── HTML generators ──────────────────────────────────────────────────────────

// Returns the first paragraph of the body (text up to first blank line).
function firstParagraph(body) {
  return body.split(/\n\n+/)[0].replace(/\n/g, ' ').trim();
}

// Extracts the first URL found in a string, or returns '#'.
function extractUrl(text) {
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : '#';
}

function buildStatusLabel(tag) {
  const labels = { 'live': 'Live', 'in-progress': 'In Progress', 'archive': 'Archive' };
  return labels[tag] || tag;
}

function renderThinkEntry(e) {
  return `
    <div class="post-row" data-tags="${e.tag}">
      <div class="post-meta">
        <span class="post-date">${e.date}</span>
        <span class="post-tag-badge ${e.tag}">${e.tag}</span>
      </div>
      <div class="post-title">${e.title}</div>
      <div class="post-excerpt">${firstParagraph(e.body)}</div>
    </div>`;
}

function renderLearnEntry(e) {
  return `
        <div class="learn-entry">
          <div class="learn-entry-title">${e.title}</div>
          <div class="learn-entry-meta">${e.date}</div>
          <div class="learn-entry-excerpt">${firstParagraph(e.body)}</div>
        </div>`;
}

function renderBuildEntry(e) {
  return `
    <div class="project-card" data-status="${e.tag}">
      <div class="project-status">
        <span class="status-dot ${e.tag}"></span>
        ${buildStatusLabel(e.tag)}
      </div>
      <div class="project-title">${e.title}</div>
      <div class="project-desc">${firstParagraph(e.body)}</div>
      <div class="project-tags"></div>
    </div>`;
}

function renderRefEntry(e) {
  const url = e.url || extractUrl(e.body);
  return `
          <div class="ref-item">
            <span class="ref-name">${e.title}</span>
            <a href="${url}" class="ref-link" target="_blank" rel="noopener noreferrer">link →</a>
          </div>`;
}

// ─── Build ────────────────────────────────────────────────────────────────────

function build() {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error('template.html not found in docs/ — paste your HTML there first.');
    process.exit(1);
  }

  const all = loadAllContent();
  console.log(`Loaded ${all.length} content entries.`);

  const think        = all.filter(e => e.type === 'think');
  const build_       = all.filter(e => e.type === 'build');
  const foundations  = all.filter(e => e.type === 'learn' && e.tag === 'foundations');
  const applied      = all.filter(e => e.type === 'learn' && e.tag === 'applied');
  const refs         = all.filter(e => e.type === 'refs' || e.type === 'ref');

  const injections = {
    '<!-- THINK_CONTENT -->':              think.map(renderThinkEntry).join('\n') || '',
    '<!-- BUILD_CONTENT -->':              build_.map(renderBuildEntry).join('\n') || '',
    '<!-- LEARN_FOUNDATIONS_CONTENT -->':  foundations.map(renderLearnEntry).join('\n') || '',
    '<!-- LEARN_APPLIED_CONTENT -->':      applied.map(renderLearnEntry).join('\n') || '',
    '<!-- REFS_CONTENT -->':               refs.map(renderRefEntry).join('\n') || '',
  };

  let output = fs.readFileSync(TEMPLATE_FILE, 'utf8');

  for (const [marker, html] of Object.entries(injections)) {
    if (!output.includes(marker)) {
      console.warn(`Warning: marker not found in template — ${marker}`);
    }
    output = output.replace(marker, html);
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

  console.log('Built → docs/index.html');
  console.log(`  think:       ${think.length} entries`);
  console.log(`  build:       ${build_.length} entries`);
  console.log(`  foundations: ${foundations.length} entries`);
  console.log(`  applied:     ${applied.length} entries`);
  console.log(`  refs:        ${refs.length} entries`);
}

build();
