import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

old_sim_prompt = """6. Jadual Keputusan: Sediakan jadual pemerhatian (PB) yang diisi apabila pelajar berjaya melengkapkan simulasi.
7. Eksport Laporan (Lab Report): Sediakan butang 'Eksport Laporan / Cetak' yang memaparkan keseluruhan laporan eksperimen (Tujuan, Hipotesis, Pembolehubah, Prosedur, dan Jadual Keputusan lengkap) untuk pelajar sekolah menengah mencetaknya (window.print()).`;"""

new_sim_prompt = """6. Jadual Keputusan: Sediakan jadual pemerhatian (PB) yang diisi apabila pelajar berjaya melengkapkan simulasi.
7. Eksport Laporan (Lab Report): Sediakan butang 'Eksport Laporan / Cetak' yang memaparkan keseluruhan laporan eksperimen (Tujuan, Hipotesis, Pembolehubah, Prosedur, dan Jadual Keputusan lengkap) untuk pelajar sekolah menengah mencetaknya (window.print()).
8. Had Saiz (PENTING): Jangan gunakan imej Base64 yang besar. Pastikan saiz fail tidak melebihi 45,000 aksara.`;"""

content = content.replace(old_sim_prompt, new_sim_prompt)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
