import sys
import re

with open("src/lib/sheets.ts", "r") as f:
    content = f.read()

# 1. Update saveSimulasiToSheets
old_sim_append = """    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.bab, data.html]
      ]
    })"""

new_sim_append = """    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.bab, ...chunkHtml(data.html)]
      ]
    })"""

# 2. Update saveQuestionToSheets
old_q_append = """    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.subjek, data.bab, data.sp, data.html]
      ]
    })"""

new_q_append = """    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.subjek, data.bab, data.sp, chunkHtml(data.html)[0]]
      ]
    })"""

content = content.replace(old_sim_append, new_sim_append)
content = content.replace(old_q_append, new_q_append)

chunk_func = """
function chunkHtml(html: string): string[] {
  const MAX_CELL_LENGTH = 49000;
  if (!html) return [""];
  const chunks = [];
  for (let i = 0; i < html.length; i += MAX_CELL_LENGTH) {
    chunks.push(html.substring(i, i + MAX_CELL_LENGTH));
  }
  return chunks;
}
"""

if "function chunkHtml" not in content:
    content = chunk_func + "\n" + content

with open("src/lib/sheets.ts", "w") as f:
    f.write(content)
