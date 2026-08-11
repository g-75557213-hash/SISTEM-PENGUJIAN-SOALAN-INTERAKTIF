import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

target = """  if (updatedRange) {
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

replacement = """  let idSimulasi = "";
  let linkSimulasi = "";

  if (updatedRange) {
    const rowMatch = updatedRange.match(/\\d+$/);
    if (rowMatch) {
      const rowNum = parseInt(rowMatch[0], 10);
      
      // Calculate ID and Link
      idSimulasi = `SS-${String(rowNum - 1).padStart(4, '0')}`;
      const defaultGasUrl = "https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec";
      linkSimulasi = `${defaultGasUrl}?sid=${idSimulasi}`;
      
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
  
  return { success: true, idSimulasi, linkSimulasi };"""

content = content.replace(target, replacement)

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
