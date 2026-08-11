const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<ol className="text-xs text-slate-500 list-decimal pl-5 space-y-1">[\s\S]*?<\/ol>/, 
`<ol className="text-xs text-slate-500 list-decimal pl-5 space-y-1">
                  <li>Di Google Spreadsheet anda, pergi ke menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Padamkan sebarang kod asal dan tampal kod Apps Script di bawah.</li>
                  <li>Tekan ikon <strong>Save (Disket)</strong> dan tutup editor skrip.</li>
                  <li>Pastikan anda telah menetapkan formula pada Lajur H dan Lajur I untuk menjana ID Soalan dan Pautan secara automatik.</li>
                </ol>`);

code = code.replace(/\/\/ Menjana pautan automatik apabila sheet diedit[\s\S]*?linkRange\.setValues\(linkBaruValues\);\n\}/g, '');

fs.writeFileSync('src/App.tsx', code);
