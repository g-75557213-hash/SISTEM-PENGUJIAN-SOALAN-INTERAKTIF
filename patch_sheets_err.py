import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

content = content.replace(
    "`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:E1`",
    "`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:E1`"
)

content = content.replace(
    "`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:E1?valueInputOption=USER_ENTERED`",
    "`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:E1?valueInputOption=USER_ENTERED`"
)

content = content.replace(
    "range: `${sheetName}!A1:E1`,",
    "range: `${sheetName}!A1:E1`,"
)

content = content.replace(
    "`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:E:append?valueInputOption=USER_ENTERED`",
    "`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:E:append?valueInputOption=USER_ENTERED`"
)

content = content.replace(
    "throw new Error('Failed to save simulasi to sheets');",
    "throw new Error('Gagal simpan ke sheets (Sila pastikan tab bernama \"SIMULASI\" wujud dan betul): ' + errorData);"
)

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
