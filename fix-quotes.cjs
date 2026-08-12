const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /"  window.USER_EMAIL = '" \+ userEmail \+ "';"\s*\+/g,
  `"  window.USER_EMAIL = " + JSON.stringify(userEmail) + ";" +`
);
code = code.replace(
  /"  window.USER_NAME = '" \+ userName \+ "';"\s*\+/g,
  `"  window.USER_NAME = " + JSON.stringify(userName) + ";" +`
);
code = code.replace(
  /"  window.QID = '" \+ qid \+ "';"\s*\+/g,
  `"  window.QID = " + JSON.stringify(qid) + ";" +`
);
code = code.replace(
  /"  window.KELAS = '" \+ kelas \+ "';"\s*\+/g,
  `"  window.KELAS = " + JSON.stringify(kelas) + ";" +`
);
code = code.replace(
  /"  window.TUGASAN = '" \+ tugasan \+ "';"\s*\+/g,
  `"  window.TUGASAN = " + JSON.stringify(tugasan) + ";" +`
);
code = code.replace(
  /"  window.KOD = '" \+ kod \+ "';"\s*\+/g,
  `"  window.KOD = " + JSON.stringify(kod) + ";" +`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed quotes');
