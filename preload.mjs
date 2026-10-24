import fs from 'node:fs';
import path from 'node:path';

// Render's API service runs from the repository root and starts backend/index.js.
// Repair the two generated admin callbacks before Node parses the entrypoint.
const file=path.resolve(process.cwd(),'backend','index.js');
if(fs.existsSync(file)){
  let source=fs.readFileSync(file,'utf8');
  source=source.replace("issueStatus:x.issue_status}))});\napp.post('/api/admin/users'","issueStatus:x.issue_status}))});});\napp.post('/api/admin/users'");
  source=source.replace("createdAt:x.created_at}))});\napp.post('/api/admin/products/delete'","createdAt:x.created_at}))});});\napp.post('/api/admin/products/delete'");
  fs.writeFileSync(file,source,'utf8');
}
