const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

// 0-indexed, so 446 is line 447
if (lines[446].includes('htmlCode = \'<!DOCTYPE html>')) {
  // First, revert any previous double-escapes to single escape to be safe, then apply.
  let line = lines[446].replace(/\\\\'/g, "\\'"); 
  lines[446] = line.replace(/\\'/g, "\\\\'");
}

if (lines[448].includes('htmlCode = \'<!DOCTYPE html>')) {
  let line = lines[448].replace(/\\\\'/g, "\\'"); 
  lines[448] = line.replace(/\\'/g, "\\\\'");
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Fixed quotes in App.tsx by lines');
