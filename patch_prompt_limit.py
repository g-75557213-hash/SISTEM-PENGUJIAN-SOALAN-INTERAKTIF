import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

old_prompt_limit = """**2. Kod HTML (Single-File)**
Bina aplikasi kuiz/permainan interaktif dengan kriteria WAJIB berikut:"""

new_prompt_limit = """**2. Kod HTML (Single-File)**
Bina aplikasi kuiz/permainan interaktif dengan kriteria WAJIB berikut:
- **Had Saiz (SANGAT PENTING):** Jangan gunakan imej Base64 yang terlalu besar. Pastikan jumlah aksara kod HTML ini adalah padat dan optium (TIDAK LEBIH 45,000 aksara)."""

content = content.replace(old_prompt_limit, new_prompt_limit)

with open("src/App.tsx", "w") as f:
    f.write(content)
