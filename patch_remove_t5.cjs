const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// Remove T5 State
const t5StateStart = code.indexOf('// --- T5 Simulation State (Kadar Tindak Balas) ---');
const t5StateEnd = code.indexOf('  const allSimulations: Record<string, any[]> = {');
if (t5StateStart !== -1 && t5StateEnd !== -1) {
  code = code.substring(0, t5StateStart) + code.substring(t5StateEnd);
}

// Remove from Tingkatan 5 array
const t5ArrStart = code.indexOf("'Tingkatan 5': [ { id: 'sim_kadar_tindakbalas'");
const t5ArrEnd = code.indexOf(']', t5ArrStart);
if (t5ArrStart !== -1) {
  code = code.substring(0, t5ArrStart) + "'Tingkatan 5': []" + code.substring(t5ArrEnd + 1);
}

// Remove T5 render block
const t5RenderStart = code.indexOf("{selectedApp === 'sim_kadar_tindakbalas' && (");
const t5RenderEnd = code.indexOf("{selectedApp === 'sim_ketumpatan' && (");

if (t5RenderStart !== -1 && t5RenderEnd !== -1) {
    code = code.substring(0, t5RenderStart) + code.substring(t5RenderEnd);
}

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
