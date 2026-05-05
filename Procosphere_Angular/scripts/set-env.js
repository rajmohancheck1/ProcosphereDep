// Injects BACKEND_URL env var into environment.prod.ts at build time (used by Render).
const fs = require('fs');
const path = require('path');

const url = process.env.BACKEND_URL || '';
const content = `export const environment = {
  production: true,
  apiUrl: '${url}'
};\n`;

const dest = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(dest, content);
console.log(`[set-env] apiUrl set to "${url}"`);
