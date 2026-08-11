import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

new_func = """
export async function saveSimulasiToSheets(
  token: string, 
  data: { namaGuru: string, tingkatan: string, bab: string, html: string },
  spreadsheetIdInput?: string
) {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  const sheetName = 'SIMULASI';
  
  const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
  
  let isSheetEmpty = true;
  try {
    const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:E1`, {
      headers: { Authorization: `Bearer ${token}` }
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
  
  if (isSheetEmpty) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:E1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${sheetName}!A1:E1`,
          majorDimension: 'ROWS',
          values: [
            ["Timestamp", "Nama Guru", "Tingkatan", "Tajuk / Eksperimen", "CODE HTML"]
          ]
        })
      });
    } catch (e) {
      console.error('Error writing header row:', e);
    }
  }
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:E:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.bab, data.html]
      ]
    })
  });
  
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Failed to save simulasi to sheets');
  }
  
  return { success: true };
}

export interface SoalanData {"""

content = content.replace("export interface SoalanData {", new_func)

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
