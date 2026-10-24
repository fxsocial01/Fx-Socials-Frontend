import fs from 'node:fs';
import path from 'node:path';

const file=path.resolve(process.cwd(),'backend/index.js');
let source=fs.readFileSync(file,'utf8');

// Repair two route callbacks from the previous generated build before Node parses index.js.
source=source.replace(
  "issueStatus:x.issue_status}))});\napp.post('/api/admin/users'",
  "issueStatus:x.issue_status}))});});\napp.post('/api/admin/users'"
);
source=source.replace(
  "createdAt:x.created_at}))});\napp.post('/api/admin/products/delete'",
  "createdAt:x.created_at}))});});\napp.post('/api/admin/products/delete'"
);

// Seller listings use the requested seller price plus a 40% FX Socials marketplace margin.
source=source.replace(
  "const margin=Math.round(price*LISTING_MARKUP_PERCENT)/100;const buyerPrice=price+margin;",
  "const margin=Math.round(price*LISTING_MARKUP_PERCENT)/100;const buyerPrice=price+margin;"
);

fs.writeFileSync(file,source,'utf8');
