import crypto from 'node:crypto';

function classNameFor(style) {
  const hash = crypto.createHash('sha1').update(style.trim()).digest('hex').slice(0, 10);
  return `vsx-${hash}`;
}

// Read actual HTML tokens, not apparent tags inside JS/CSS/template source.
// Attribute delimiters are recognized only outside quoted values (which may
// themselves contain >, <, or the opposite quote character).
function readTag(text, start) {
  const head = text.slice(start).match(/^<\/?([a-zA-Z][\w:-]*)(?=[\s/>])/);
  if (!head) return null;
  let i = start + head[0].length, quote = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return { start, end: i + 1, name: head[1].toLowerCase(), closing: text[start + 1] === '/', headEnd: start + head[0].length };
  }
  return null;
}

function attributes(text, tag) {
  const result = []; let i = tag.headEnd;
  while (i < tag.end - 1) {
    const whitespaceStart = i;
    while (/\s/.test(text[i] || '') && i < tag.end - 1) i++;
    if (i >= tag.end - 1 || text[i] === '/') break;
    const start = i;
    while (i < tag.end - 1 && !/[\s=/>]/.test(text[i])) i++;
    if (start === i) { i++; continue; }
    const name = text.slice(start, i).toLowerCase();
    while (/\s/.test(text[i] || '') && i < tag.end - 1) i++;
    let valueStart = i, valueEnd = i, quote = null;
    if (text[i] === '=') {
      i++; while (/\s/.test(text[i] || '') && i < tag.end - 1) i++;
      if (text[i] === '"' || text[i] === "'") {
        quote = text[i++]; valueStart = i;
        while (i < tag.end - 1 && text[i] !== quote) i++;
        valueEnd = i; if (text[i] === quote) i++;
      } else {
        valueStart = i; while (i < tag.end - 1 && !/\s/.test(text[i])) i++;
        valueEnd = i;
      }
    }
    result.push({ name, start, end: i, whitespaceStart, valueStart, valueEnd, quote, value: text.slice(valueStart, valueEnd) });
  }
  return result;
}

const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes']);
function rawEnd(text, start, name) {
  const close = new RegExp(`</${name}(?=[\\s/>])`, 'ig'); close.lastIndex = start;
  const match = close.exec(text);
  return match ? (readTag(text, match.index)?.end ?? text.length) : text.length;
}
function templateEnd(text, start) {
  let depth = 1, i = start;
  while (i < text.length) {
    const next = text.indexOf('<', i); if (next < 0) return text.length;
    if (text.startsWith('<!--', next)) { const end = text.indexOf('-->', next + 4); i = end < 0 ? text.length : end + 3; continue; }
    const tag = readTag(text, next); if (!tag) { i = next + 1; continue; }
    i = tag.end;
    if (tag.name === 'template') { depth += tag.closing ? -1 : 1; if (!depth) return i; }
    else if (!tag.closing && RAW_TEXT.has(tag.name)) i = rawEnd(text, i, tag.name);
  }
  return text.length;
}

function rewriteTag(text, tag, styles) {
  if (tag.closing) return text.slice(tag.start, tag.end);
  const attrs = attributes(text, tag), style = attrs.find(a => a.name === 'style');
  if (!style?.value.trim()) return text.slice(tag.start, tag.end);
  const className = classNameFor(style.value);
  styles.set(className, style.value.trim().replace(/\s+/g, ' '));
  const existing = attrs.find(a => a.name === 'class');
  const edits = [{ start: style.whitespaceStart, end: style.end, value: '' }];
  if (existing) {
    const names = new Set(existing.value.split(/\s+/).filter(Boolean)); names.add(className);
    edits.push({ start: existing.start, end: existing.end, value: `class=${existing.quote || '"'}${[...names].join(' ')}${existing.quote || '"'}` });
  } else {
    const insertion = text[tag.end - 2] === '/' ? tag.end - 2 : tag.end - 1;
    edits.push({ start: insertion, end: insertion, value: ` class="${className}"` });
  }
  let result = text.slice(tag.start, tag.end);
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start - tag.start) + edit.value + result.slice(edit.end - tag.start);
  return result;
}

export function extractFromHtml(text, styles) {
  let out = '', at = 0;
  while (at < text.length) {
    const next = text.indexOf('<', at);
    if (next < 0) { out += text.slice(at); break; }
    out += text.slice(at, next);
    if (text.startsWith('<!--', next) || text.startsWith('<![CDATA[', next)) {
      const marker = text.startsWith('<!--', next) ? '-->' : ']]>', end = text.indexOf(marker, next + 4), stop = end < 0 ? text.length : end + marker.length;
      out += text.slice(next, stop); at = stop; continue;
    }
    const tag = readTag(text, next);
    if (!tag) { out += '<'; at = next + 1; continue; }
    out += rewriteTag(text, tag, styles); at = tag.end;
    if (!tag.closing && (RAW_TEXT.has(tag.name) || tag.name === 'template' || tag.name === 'plaintext')) {
      const stop = tag.name === 'template' ? templateEnd(text, at) : tag.name === 'plaintext' ? text.length : rawEnd(text, at, tag.name);
      out += text.slice(at, stop); at = stop;
    }
  }
  return out;
}
