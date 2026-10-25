import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.js');
let source = fs.readFileSync(file, 'utf8');
const lines = source.split('\n');
const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  out.push(line);
  if ((line.startsWith("app.post('/api/admin/orders'") || line.startsWith("app.post('/api/admin/users',")) && lines[i + 1] !== '});') {
    out.push('});');
  }
}
source = out.join('\n');
fs.writeFileSync(file, source, 'utf8');
