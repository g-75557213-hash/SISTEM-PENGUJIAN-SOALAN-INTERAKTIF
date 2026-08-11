const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/htmlCode = '<!DOCTYPE html><html><head><script src="https:\/\/cdn.tailwindcss.com"><\/script><\/head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-blue-400 mb-4">Simulasi Ketumpatan \(Demo\)<\/h2>(.*?)';/g, function(match) {
  return match.replace(/\\'/g, "\\\\'");
});
code = code.replace(/htmlCode = '<!DOCTYPE html><html><head><script src="https:\/\/cdn.tailwindcss.com"><\/script><\/head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-fuchsia-400 mb-4">Bandul Ringkas \(Demo\)<\/h2>(.*?)';/g, function(match) {
  return match.replace(/\\'/g, "\\\\'");
});
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed quotes in App.tsx');
