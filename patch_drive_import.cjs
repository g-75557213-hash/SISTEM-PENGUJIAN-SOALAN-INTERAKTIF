const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importTarget = `import { googleSignIn, initAuth, logout, getAccessToken } from './lib/firebase';`;
const newImport = importTarget + `\nimport { uploadFileToDrive } from './lib/drive';`;
if (!code.includes("import { uploadFileToDrive }")) {
  code = code.replace(importTarget, newImport);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Added drive import');
}
