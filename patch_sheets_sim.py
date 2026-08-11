import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

new_func = """
async function getSimulasiSheetName(token: string, spreadsheetId: string): Promise<string> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.sheets) {
        const simulasiSheet = data.sheets.find((s: any) => s.properties.title.toLowerCase() === 'simulasi');
        if (simulasiSheet) {
          return simulasiSheet.properties.title;
        }
      }
    }
  } catch (e: any) {
    console.error('Error fetching sheet name:', e);
  }
  return 'SIMULASI'; // Fallback
}
"""

if "getSimulasiSheetName" not in content:
    content = new_func + content

content = content.replace(
    "const sheetName = 'SIMULASI';",
    "const sheetName = await getSimulasiSheetName(token, spreadsheetId);"
)

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
