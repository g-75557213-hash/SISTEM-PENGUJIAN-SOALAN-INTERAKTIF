const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// Remove everything from "const uniqueSubjek" down to "const startLobby" and "simulateStudentJoin"
const startRemove = code.indexOf('  // -- GAMIFICATION SELECTION STATE --');
const endRemove = code.indexOf('  // ---------------------------------------------------------');

if (startRemove !== -1 && endRemove !== -1) {
  code = code.substring(0, startRemove) + code.substring(endRemove);
}

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
