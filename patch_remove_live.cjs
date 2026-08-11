const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// Replace state variables
code = code.replace(/  const \[gamiSubject, setGamiSubject\] = useState<string>\(''\);\n/g, '');
code = code.replace(/  const \[gamiForm, setGamiForm\] = useState<string>\(''\);\n/g, '');
code = code.replace(/  const \[gamiQuestion, setGamiQuestion\] = useState<SoalanData \| null>\(null\);\n/g, '');
code = code.replace(/  const \[teachingMode, setTeachingMode\] = useState<'online' \| 'offline_paper'>\('online'\);\n/g, '');
code = code.replace(/  const \[isLobbyActive, setIsLobbyActive\] = useState\(false\);\n/g, '');
code = code.replace(/  const \[joinedStudents, setJoinedStudents\] = useState<any\[\]>\(\[\]\);\n/g, '');
code = code.replace(/  const \[gameCode, setGameCode\] = useState\(''\);\n/g, '');

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
