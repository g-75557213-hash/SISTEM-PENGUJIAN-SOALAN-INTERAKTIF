const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');

code = code.replace(
`                  return previewQuestion.html.replace('</head>', \`\${scriptToInject}</head>\`);`,
`                  let resultHtml = previewQuestion.html.replace('</head>', \`\${scriptToInject}</head>\`);
                  // Inject CSS to hide horizontal scroll
                  resultHtml = resultHtml.replace('<style>', '<style>body{overflow-x:hidden !important; max-width: 100vw; margin:0; padding:0; box-sizing:border-box;} *{box-sizing:border-box;}</style><style>');
                  return resultHtml;`
);

fs.writeFileSync('src/components/BankSoalan.tsx', code);
