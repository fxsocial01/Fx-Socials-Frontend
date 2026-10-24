import fs from 'node:fs';
import path from 'node:path';

// Render starts the API with cwd=backend and entrypoint=backend/index.js.
// This preload runs before index.js is parsed and repairs the two generated
// admin route callbacks that were missing their closing callback delimiters.
const file=path.resolve(process.cwd(),'index.js');
let source=fs.readFileSync(file,'utf8');
source=source.replace("issueStatus:x.issue_status}))});\napp.post('/api/admin/users'","issueStatus:x.issue_status}))});});\napp.post('/api/admin/users'");
source=source.replace("createdAt:x.created_at}))});\napp.post('/api/admin/products/delete'","createdAt:x.created_at}))});});\napp.post('/api/admin/products/delete'");
fs.writeFileSync(file,source,'utf8');
