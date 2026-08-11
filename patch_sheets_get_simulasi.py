import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

new_func = """
export interface SimulasiData {
  timestamp: string;
  namaGuru: string;
  tingkatan: string;
  bab: string;
  html: string;
}

export async function getSimulasiFromSheets(token: string, spreadsheetIdInput?: string): Promise<SimulasiData[]> {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  const sheetName = await getSimulasiSheetName(token, spreadsheetId);
  
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHENTICATED');
      console.error('Failed to fetch simulasi from sheets');
      return [];
    }

    const data = await res.json();
    const rows = data.values || [];
    
    if (rows.length === 0) return [];
    
    // Dynamically detect header row
    const firstRow = rows[0];
    const hasHeader = firstRow && firstRow[0] && (
      firstRow[0].toLowerCase().includes('time') || 
      firstRow[0].toLowerCase().includes('timestamp') || 
      firstRow[1].toLowerCase().includes('nama')
    );
    
    const startIdx = hasHeader ? 1 : 0;
    
    return rows.slice(startIdx).map((row: any[]) => {
      let fullHtml = row[4] || '';
      for (let i = 5; i < row.length; i++) {
        if (row[i]) fullHtml += row[i];
      }
      return {
        timestamp: row[0] || '',
        namaGuru: row[1] || '',
        tingkatan: row[2] || '',
        bab: row[3] || '',
        html: fullHtml
      };
    }).filter((sim: SimulasiData) => sim.html && sim.html.trim() !== '');
  } catch (err) {
    console.error('Error in getSimulasiFromSheets:', err);
    return [];
  }
}
"""

if "export async function getSimulasiFromSheets" not in content:
    content += "\n" + new_func

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
