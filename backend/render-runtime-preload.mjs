import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.js');
let source = fs.readFileSync(file, 'utf8');

const imports = [
  "import { registerApiPlatform } from './api-platform.js';",
  "import { registerDeveloperPortal } from './developer-portal.js';",
  "import { registerTempNumberRoutes } from './temp-number-routes.js';",
  "import { registerPaystackRuntimeRoutes } from './paystack-runtime-routes.js';",
];
for (const line of imports) {
  if (!source.includes(line)) source = line + '\n' + source;
}

if (!source.includes('registerApiPlatform({app,pool,auth,admin})')) {
  source = source.replace(
    'app.listen(PORT',
    "registerApiPlatform({app,pool,auth,admin});\nregisterDeveloperPortal({app});\nregisterTempNumberRoutes({app,pool,auth});\nregisterPaystackRuntimeRoutes({app});\napp.listen(PORT"
  );
}

source = source.replace(
  /callback_url:\s*`\$\{FRONTEND_URL\}\/\#\/wallet`/g,
  "callback_url:BACKEND_PUBLIC_URL+'/api/wallet/callback'"
);

fs.writeFileSync(file, source, 'utf8');
