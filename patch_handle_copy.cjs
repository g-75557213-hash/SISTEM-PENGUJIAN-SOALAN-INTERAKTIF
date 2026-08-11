const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `    const kriteriaTambahan = promptKriteria.trim() ? \`\\nKRITERIA GURU (SANGAT PENTING - ANDA WAJIB IKUTI):\\n\${promptKriteria}\\n\` : '';`;

const replacement = `    const kriteriaTambahan = promptKriteria.trim() ? \`\\nKRITERIA GURU (SANGAT PENTING - ANDA WAJIB IKUTI):\\n\${promptKriteria}\\n\` : '';
    const videoPrompt = videoUrl ? \`\\n\\nSILA MASUKKAN VIDEO INI SEBAGAI RUJUKAN DI DALAM APLIKASI (Contohnya di bahagian tepi atau atas aplikasi):\\n<video src="\${videoUrl}" controls width="100%"></video>\\nPastikan video ini berfungsi.\\n\` : '';`;

code = code.replace(target, replacement);

const targetPrompt = "Ubah nilai, senario, watak, dan maklumat supaya ia menjadi satu soalan/kuiz yang berbeza namun menguji kemahiran dan topik yang sama. ${kriteriaTambahan}";
const replacementPrompt = "Ubah nilai, senario, watak, dan maklumat supaya ia menjadi satu soalan/kuiz yang berbeza namun menguji kemahiran dan topik yang sama. ${kriteriaTambahan}${videoPrompt}";

code = code.replace(targetPrompt, replacementPrompt);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched prompt generator logic in App.tsx');
