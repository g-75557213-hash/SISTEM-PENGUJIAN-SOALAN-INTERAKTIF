const fs = require('fs');
let code = fs.readFileSync('src/lib/sheets.ts', 'utf8');

const oldSave = `  // Generate a unique UUID for the question
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  const idSoalan = generateUUID();
  
  // Base link detection (handle Google ecosystem frames safely)
  let baseLink = \`\${window.location.origin}\${window.location.pathname}\`;
  if (window.location.hostname.includes('googleusercontent.com') && gasWebAppUrl) {
    baseLink = gasWebAppUrl;
  }
  
  // Generate the tracked interactive student link
  const linkSoalan = \`\${baseLink}\${baseLink.includes('?') ? '&' : '?'}qid=\${idSoalan}&spreadsheetId=\${spreadsheetId}&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;

  // Check if sheet is empty by trying to get A1:I1
  let isSheetEmpty = true;
  try {
    const checkRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/\${encodeURIComponent(sheetName)}!A1:I1\`, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.values && checkData.values.length > 0) {
        isSheetEmpty = false;
      }
    }
  } catch (e) {
    console.error('Error checking if sheet is empty:', e);
  }
  
  // If empty, write the header row first
  if (isSheetEmpty) {
    try {
      const headerRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/\${encodeURIComponent(sheetName)}!A1:I1?valueInputOption=USER_ENTERED\`, {
        method: 'PUT',
        headers: {
          Authorization: \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: \`\${sheetName}!A1:I1\`,
          majorDimension: 'ROWS',
          values: [
            ["Timestamp", "Nama Guru", "Tingkatan", "Subjek", "Bab", "SP", "HTML", "ID Soalan", "Link Soalan"]
          ]
        })
      });
      if (!headerRes.ok) {
        console.warn('Failed to write header row:', await headerRes.text());
      }
    } catch (e) {
      console.error('Error writing header row:', e);
    }
  }
  
  // Append the question data
  const res = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/\${encodeURIComponent(sheetName)}!A:G:append?valueInputOption=USER_ENTERED\`, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.subjek, data.bab, data.sp, data.html, idSoalan, linkSoalan]
      ]
    })
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Failed to save question to sheets');
  }

  // Save to Firestore too for instant, private-safe loading by students
  try {
    await fetch('/api/save-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idSoalan,
        namaGuru: data.namaGuru,
        tingkatan: data.tingkatan,
        subjek: data.subjek,
        bab: data.bab,
        sp: data.sp,
        html: data.html,
        linkSoalan
      })
    });
  } catch (e) {
    console.error('Failed to cache question in Firestore:', e);
  }`;

console.log(code.includes('const generateUUID = () => {'));
