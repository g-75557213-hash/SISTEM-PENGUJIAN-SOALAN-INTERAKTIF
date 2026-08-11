import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

old_sim_prompt_html = """7. Eksport Laporan: Sediakan butang cetak Laporan Amali lengkap."""

new_sim_prompt_html = """7. Eksport Laporan: Sediakan butang cetak Laporan Amali lengkap.<br/>
8. Had Saiz: Elakkan Base64, pastikan saiz kod di bawah 45,000 aksara."""

content = content.replace(old_sim_prompt_html, new_sim_prompt_html)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
