import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.js');
let source = fs.readFileSync(file, 'utf8');

// Repair the two admin route declarations that were missing the final
// callback closure in the checked-in source. This runs before index.js loads.
source = source.replace(
  "res.json({orders:r.rows.map(x=>({id:x.id,orderNumber:x.order_number||x.id,productName:x.product_name,amount:naira(x.amount_kobo),status:x.status,userEmail:x.user_email,buyerStatus:x.buyer_status,issueStatus:x.issue_status}))});",
  "res.json({orders:r.rows.map(x=>({id:x.id,orderNumber:x.order_number||x.id,productName:x.product_name,amount:naira(x.amount_kobo),status:x.status,userEmail:x.user_email,buyerStatus:x.buyer_status,issueStatus:x.issue_status}))});});"
);
source = source.replace(
  "res.json({users:r.rows.map(x=>({userId:x.id,name:x.name,email:x.email,balance:naira(x.balance_kobo),role:x.role,createdAt:x.created_at}))});",
  "res.json({users:r.rows.map(x=>({userId:x.id,name:x.name,email:x.email,balance:naira(x.balance_kobo),role:x.role,createdAt:x.created_at}))});});"
);
fs.writeFileSync(file, source, 'utf8');
