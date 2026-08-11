import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

target = """  const appendData = await res.json();
  const updatedRange = appendData.updates?.updatedRange;
  
  let idSoalan = "";
  let linkSoalan = "";
  
  if (updatedRange) {"""

replacement = """  const appendData = await res.json();
  const updatedRange = appendData.updates?.updatedRange;
  
  // Save extra HTML chunks to column J onwards (to prevent overwriting H and I)
  if (updatedRange) {
    const rowMatch = updatedRange.match(/\\d+$/);
    if (rowMatch) {
      const rowNum = parseInt(rowMatch[0], 10);
      const chunks = chunkHtml(data.html);
      if (chunks.length > 1) {
        const extraChunks = chunks.slice(1);
        try {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!J${rowNum}?valueInputOption=USER_ENTERED`, {
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
          console.error("Failed to save extra HTML chunks:", e);
        }
      }
    }
  }
  
  let idSoalan = "";
  let linkSoalan = "";
  
  if (updatedRange) {"""

content = content.replace(target, replacement)

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
