const fs = require('fs');
let content = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');

content = content.replace(
  '<div className="p-4 flex flex-col flex-1">',
  '<div className="p-3 flex flex-col flex-1">'
);

fs.writeFileSync('src/components/BankSoalan.tsx', content);
