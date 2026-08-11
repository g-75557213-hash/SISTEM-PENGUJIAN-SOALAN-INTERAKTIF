import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "alert('Gagal menyimpan simulasi');",
    "alert('Gagal menyimpan simulasi: ' + (err.message || 'Sila pastikan tab bernama SIMULASI wujud di Google Sheets anda.'));"
)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
