import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

old_integration = """**INTEGRASI MARKAH (SANGAT PENTING):**
Apabila permainan tamat dan markah akhir (0-100) dikira, anda WAJIB menyertakan dan memanggil fungsi ringkas ini di dalam skrip JavaScript anda untuk menghantar markah ke sistem utama kami."""

new_integration = """**INTEGRASI PENGGUNA & MARKAH (SANGAT PENTING):**
Pelajar TIDAK PERLU memasukkan nama atau email mereka di dalam permainan. Sistem pelayan telah memasukkan (inject) maklumat pelajar secara automatik ke dalam objek \`window\`.
Anda boleh menggunakan \`window.USER_NAME\` dan \`window.USER_EMAIL\` untuk memaparkan nama dan email pelajar di antaramuka permainan (contoh: "Selamat Datang, " + window.USER_NAME).

Apabila permainan tamat dan markah akhir (0-100) dikira, anda WAJIB menyertakan dan memanggil fungsi ringkas ini di dalam skrip JavaScript anda untuk menghantar markah ke sistem utama kami."""

content = content.replace(old_integration, new_integration)

with open("src/App.tsx", "w") as f:
    f.write(content)
