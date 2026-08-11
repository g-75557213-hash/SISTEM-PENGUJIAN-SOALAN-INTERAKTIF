import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

target = """    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.bab, ...chunkHtml(data.html)]
      ]
    })
  });
  
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Gagal simpan ke sheets (Sila pastikan tab bernama "SIMULASI" wujud dan betul): ' + errorData);
  }
  
  return { success: true };"""

replacement = """    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.bab, chunkHtml(data.html)[0], chunkHtml(data.html)[1] || ""]
      ]
    })
  });
  
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Gagal simpan ke sheets (Sila pastikan tab bernama "SIMULASI" wujud dan betul): ' + errorData);
  }
  
  // Save extra HTML chunks to column I onwards (to prevent overwriting G and H)
  const appendData = await res.json();
  const updatedRange = appendData.updates?.updatedRange;
  
  if (updatedRange) {
    const rowMatch = updatedRange.match(/\\d+$/);
    if (rowMatch) {
      const rowNum = parseInt(rowMatch[0], 10);
      const chunks = chunkHtml(data.html);
      if (chunks.length > 2) {
        const extraChunks = chunks.slice(2);
        try {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!I${rowNum}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [extraChunks]
            })
          });
        } catch (e) {
          console.error("Failed to save extra HTML chunks for Simulasi:", e);
        }
      }
    }
  }
  
  return { success: true };"""

content = content.replace(target, replacement)

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
