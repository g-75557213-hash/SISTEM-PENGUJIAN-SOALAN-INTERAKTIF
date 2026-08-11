import sys

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

content = content.replace("!A:I", "!A:Z")

old_map = """  return rows.slice(startIdx).map((row: any[]) => ({
    timestamp: row[0] || '',
    namaGuru: row[1] || '',
    tingkatan: row[2] || '',
    subjek: row[3] || '',
    bab: row[4] || '',
    sp: row[5] || '',
    html: row[6] || '',
    idSoalan: row[7] || '',
    linkSoalan: row[8] || ''
  }));"""

new_map = """  return rows.slice(startIdx).map((row: any[]) => {
    let fullHtml = row[6] || '';
    // Collect any extra chunks from column J (index 9) onwards
    for (let i = 9; i < row.length; i++) {
      if (row[i]) fullHtml += row[i];
    }
    return {
      timestamp: row[0] || '',
      namaGuru: row[1] || '',
      tingkatan: row[2] || '',
      subjek: row[3] || '',
      bab: row[4] || '',
      sp: row[5] || '',
      html: fullHtml,
      idSoalan: row[7] || '',
      linkSoalan: row[8] || ''
    };
  });"""

content = content.replace(old_map, new_map)

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
