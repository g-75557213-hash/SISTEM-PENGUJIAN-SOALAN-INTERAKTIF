const fs = require('fs');
let code = fs.readFileSync('src/lib/sheets.ts', 'utf8');

const regex = /\/\/ Generate a unique UUID for the question[\s\S]*console\.error\('Failed to cache question in Firestore:', e\);\n  \}/;

const newSave = `  // Check if sheet is empty by trying to get A1:I1
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
  
  // If empty, write the header row first. User should have formulas in H1 and I1, so we write headers A-G only.
  if (isSheetEmpty) {
    try {
      const headerRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/\${encodeURIComponent(sheetName)}!A1:G1?valueInputOption=USER_ENTERED\`, {
        method: 'PUT',
        headers: {
          Authorization: \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: \`\${sheetName}!A1:G1\`,
          majorDimension: 'ROWS',
          values: [
            ["Timestamp", "Nama Guru", "Tingkatan", "Subjek", "Bab", "SP", "HTML"]
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
  
  // Append the question data (A-G only, so H and I are untouched for array formulas)
  const res = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/\${encodeURIComponent(sheetName)}!A:G:append?valueInputOption=USER_ENTERED\`, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.subjek, data.bab, data.sp, data.html]
      ]
    })
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Failed to save question to sheets');
  }

  const appendData = await res.json();
  const updatedRange = appendData.updates?.updatedRange;
  
  let idSoalan = "";
  let linkSoalan = "";
  
  // Fetch the row back to get the formula-generated ID and Link
  if (updatedRange) {
    // updatedRange looks like "Sheet1!A5:G5"
    const rowMatch = updatedRange.match(/\\d+$/);
    if (rowMatch) {
      const rowNum = rowMatch[0];
      try {
        // Wait a small moment to let the array formula calculate
        await new Promise(r => setTimeout(r, 1000));
        
        const rowRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/\${encodeURIComponent(sheetName)}!A\${rowNum}:I\${rowNum}\`, {
          headers: { Authorization: \`Bearer \${token}\` }
        });
        if (rowRes.ok) {
          const rowData = await rowRes.json();
          if (rowData.values && rowData.values[0]) {
            idSoalan = rowData.values[0][7] || "";
            linkSoalan = rowData.values[0][8] || "";
          }
        }
      } catch (err) {
        console.error('Failed to fetch generated ID and Link:', err);
      }
    }
  }

  // Save to Firestore too for instant, private-safe loading by students
  if (idSoalan) {
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
    }
  }`;

code = code.replace(regex, newSave);
fs.writeFileSync('src/lib/sheets.ts', code);
