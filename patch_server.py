import sys

with open("server.ts", "r") as f:
    content = f.read()

old_logic = """      // 3. Read/fetch the URL created by Apps Script on Column I ONLY if it is a Google Apps Script URL.
      // If it is our React App direct URL, we do not fetch it; instead, we return the direct question HTML from fallbackHtml.
      if (linkSoalan && linkSoalan.startsWith("http") && linkSoalan.includes("script.google.com")) {"""

new_logic = """      // 3. If we already have the full HTML from Firestore (which has no 50k character limit),
      // we prioritize returning it over the Google Apps Script version to prevent truncation issues.
      if (fallbackHtml && fallbackHtml.trim().length > 100) {
         console.log(`Menggunakan cache Firestore yang lengkap untuk soalan ${qid}`);
         return res.json({ html: fallbackHtml });
      }

      // 4. Read/fetch the URL created by Apps Script on Column I ONLY if it is a Google Apps Script URL.
      // If it is our React App direct URL, we do not fetch it; instead, we return the direct question HTML from fallbackHtml.
      if (linkSoalan && linkSoalan.startsWith("http") && linkSoalan.includes("script.google.com")) {"""

content = content.replace(old_logic, new_logic)

with open("server.ts", "w") as f:
    f.write(content)
