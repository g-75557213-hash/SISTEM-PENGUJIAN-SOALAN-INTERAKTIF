const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');

const getDirectLinkStr = `const directLink = (q.linkSoalan && q.linkSoalan.startsWith('http')) ? q.linkSoalan : (gasWebAppUrl 
                                    ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${q.idSoalan}\`
                                    : \`\${window.location.origin}/?qid=\${q.idSoalan}&spreadsheetId=\${spreadsheetId}&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`);`;

const getSendLinkStr = `const link = (sendQ.linkSoalan && sendQ.linkSoalan.startsWith('http')) ? sendQ.linkSoalan : (gasWebAppUrl 
          ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${sendQ.idSoalan}\`
          : \`\${window.location.origin}/\${qs}\`);`;

code = code.replace(/const directLink = gasWebAppUrl\s*\?[^:]+:[^;]+;/g, getDirectLinkStr);
code = code.replace(/const link = gasWebAppUrl\s*\?[^:]+:[^;]+;/g, getSendLinkStr);

fs.writeFileSync('src/components/BankSoalan.tsx', code);
