const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const TEMPLATE_FILE = path.join(__dirname, 'docs', 'template.html');
const OUTPUT_FILE = path.join(__dirname, 'docs', 'index.html');
const CONTENT_TYPES = ['think', 'learn', 'build', 'refs'];

// Parse a single content file into a structured object.
// Returns null if no valid PUBLISH BLOCK is found.
function parseContentFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/---PUBLISH BLOCK---([\s\S]*?)---END---/);
  if (!match) return null;

  const block = match[1].trim();
  const lines = block.split('\n');
  const entry = { type: null, title: null, tag: null, date: null, body: '' };
  let inBody = false;

  for (const line of lines) {
    if (inBody) {
      entry.body += (entry.body ? '\n' : '') + line;
      continue;
    }
    if (line.startsWith('TYPE:'))        { entry.type  = line.slice(5).trim(); continue; }
    if (line.startsWith('TITLE:'))       { entry.title = line.slice(6).trim(); continue; }
    if (line.startsWith('TAG/SECTION:')) { entry.tag   = line.slice(12).trim(); continue; }
    if (line.startsWith('DATE:'))        { entry.date  = line.slice(5).trim(); continue; }
    if (line.startsWith('BODY:'))        { entry.body  = line.slice(5).trim(); inBody = true; continue; }
  }

  return entry;
}

// Read all .txt files from every content subfolder and return parsed entries.
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
  // Sort by date descending (most recent first)
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  return entries;
}

// Convert body text into HTML paragraphs (blank line = new paragraph).
function bodyToHtml(body) {
  return body
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

// Build the full HTML for all entries and inject into the template.
function build() {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error('template.html not found in site/ — paste your HTML there first.');
    process.exit(1);
  }

  const entries = loadAllContent();
  console.log(`Found ${entries.length} content entries.`);

  // Build an HTML block for each entry.
  const contentHtml = entries.map(entry => `
<article class="entry" data-type="${entry.type}" data-tag="${entry.tag}">
  <header class="entry-header">
    <span class="entry-type">${entry.type}</span>
    <span class="entry-tag">${entry.tag}</span>
    <span class="entry-date">${entry.date}</span>
  </header>
  <h2 class="entry-title">${entry.title}</h2>
  <div class="entry-body">
    ${bodyToHtml(entry.body)}
  </div>
</article>`).join('\n');

  // Inject into template between <!-- CONTENT_START --> and <!-- CONTENT_END -->.
  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const hasMarkers = template.includes('<!-- CONTENT_START -->') && template.includes('<!-- CONTENT_END -->');

  let output;
  if (hasMarkers) {
    output = template.replace(
      /<!-- CONTENT_START -->[\s\S]*?<!-- CONTENT_END -->/,
      `<!-- CONTENT_START -->\n${contentHtml}\n<!-- CONTENT_END -->`
    );
  } else {
    console.warn('Warning: template.html has no <!-- CONTENT_START --> / <!-- CONTENT_END --> markers.');
    console.warn('Appending content before </body> instead.');
    output = template.replace('</body>', `${contentHtml}\n</body>`);
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(`Built → site/index.html (${entries.length} entries)`);
}

build();
