import fs from 'node:fs';

const file = new URL('./backend/index.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');

source = source.replace(
  /app\.post\('\/api\/admin\/orders',[\s\S]*?issueStatus:x\.issue_status\}\)\}\)\);\napp\.post\('\/api\/admin\/users'/,
  (m) => m.replace(/\napp\.post\('\/api\/admin\/users'$/, '});\napp.post(\'/api/admin/users\'')
);

source = source.replace(
  /app\.post\('\/api\/admin\/users',[\s\S]*?createdAt:x\.created_at\}\)\}\)\);\napp\.post\('\/api\/admin\/products\/delete'/,
  (m) => m.replace(/\napp\.post\('\/api\/admin\/products\/delete'$/, '});\napp.post(\'/api/admin/products/delete\'')
);

fs.writeFileSync(file, source, 'utf8');
