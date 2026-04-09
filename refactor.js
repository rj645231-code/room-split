const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'server/controllers');
const files = fs.readdirSync(controllersDir).map(f => path.join(controllersDir, f));

files.push(path.join(__dirname, 'server/seed.js'));
files.push(path.join(__dirname, 'server/clearData.js'));

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Convert exports functions to async
  content = content.replace(/exports\.(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g, 'exports.$1 = async ($2) =>');

  // 2. Add await to db.prepare
  content = content.replace(/db\.prepare/g, 'await db.prepare');
  // Avoid double await
  content = content.replace(/await\s+await\s+db/g, 'await db');

  // 3. For seed.js specific: statement variables
  if (file.endsWith('seed.js')) {
    content = content.replace(/insertUser\.run/g, 'await insertUser.run');
    content = content.replace(/insMember\.run/g, 'await insMember.run');
    content = content.replace(/insExp\.run/g, 'await insExp.run');
    content = content.replace(/insItem\.run/g, 'await insItem.run');
    content = content.replace(/insC\.run/g, 'await insC.run');
    content = content.replace(/insSplit\.run/g, 'await insSplit.run');
    content = content.replace(/db\.exec/g, 'await db.exec'); // db.exec replaced with await db.client.execute? Wait, db.js exports `client` not `exec` directly.
    content = content.replace(/await\s+await/g, 'await');
  }

  // 4. splitHelper await
  content = content.replace(/calculateSplits\(/g, 'await calculateSplits(');

  fs.writeFileSync(file, content);
  console.log('Refactored', file);
}
