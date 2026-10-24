import fs from 'node:fs';
import path from 'node:path';

// Render starts the API with cwd=backend and entrypoint=backend/index.js.
// This preload repairs generated route delimiters and wires the public FX Socials API platform + developer portal into the existing server.
const file=path.resolve(process.cwd(),'index.js');
let source=fs.readFileSync(file,'utf8');
source=source.replace("issueStatus:x.issue_status}))});\napp.post('/api/admin/users'","issueStatus:x.issue_status}))});});\napp.post('/api/admin/users'");
source=source.replace("createdAt:x.created_at}))});\napp.post('/api/admin/products/delete'","createdAt:x.created_at}))});});\napp.post('/api/admin/products/delete'");
source=source.replace("app.get('/developers'","app.get('/developers-legacy'");
if(!source.includes("./api-platform.js"))source="import { registerApiPlatform } from './api-platform.js';\nimport { registerDeveloperPortal } from './developer-portal.js';\nimport { registerTempNumberRoutes } from './temp-number-routes.js';\n"+source;
if(!source.includes('registerApiPlatform({app,pool,auth,admin})'))source=source.replace('app.listen(PORT','registerApiPlatform({app,pool,auth,admin});\nregisterDeveloperPortal({app});\nregisterTempNumberRoutes({app,pool,auth});\napp.listen(PORT');
fs.writeFileSync(file,source,'utf8');
