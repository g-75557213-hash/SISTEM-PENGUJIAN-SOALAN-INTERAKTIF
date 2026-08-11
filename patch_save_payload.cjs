const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldSavePayload = `      const newSim = {
        timestamp: new Date().toISOString(),
        namaGuru: userName || userEmail || 'Guru',
        tingkatan: simForm.tingkatan,
        tajuk: simForm.tajuk,
        kodReact: customHTML,
        idSimulasi: 'SIM-' + Date.now()
      };`;

const newSavePayload = `      const newSim = {
        idSoalan: 'SIM-' + Date.now(),
        namaGuru: userName || userEmail || 'Guru',
        tingkatan: simForm.tingkatan,
        subjek: 'Sains',
        bab: simForm.tajuk,
        sp: 'Simulasi Eksperimen',
        html: customHTML
      };`;

if (code.includes(oldSavePayload)) {
  code = code.replace(oldSavePayload, newSavePayload);
  fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
  console.log('Successfully patched save payload!');
} else {
  console.log('Could not find save payload block!');
}
