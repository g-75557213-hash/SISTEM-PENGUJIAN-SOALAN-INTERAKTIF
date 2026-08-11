import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

old_textarea_label = """                <div>
                  <label className="text-xs text-slate-400 mb-1 block flex justify-between">
                    <span>Tampal Kod HTML dari Gemini Di Sini</span>
                    <button onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setCustomHTML(text);
                      } catch (err) {
                        alert('Gagal membaca clipboard. Sila paste (Ctrl+V) secara manual.');
                      }
                    }} className="text-blue-400 hover:text-blue-300">Paste Kod</button>
                  </label>
                  <textarea"""

new_textarea_label = """                <div>
                  <label className="text-xs text-slate-400 mb-1 block flex justify-between items-center">
                    <span>Tampal Kod HTML dari Gemini Di Sini</span>
                    {customHTML.trim() ? (
                      <button onClick={() => {
                        setCustomHTML('');
                        setPreviewHTML('');
                      }} className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1">
                        Padam Kod
                      </button>
                    ) : (
                      <button onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          setCustomHTML(text);
                        } catch (err) {
                          alert('Gagal membaca clipboard. Sila paste (Ctrl+V) secara manual.');
                        }
                      }} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        Paste Kod
                      </button>
                    )}
                  </label>
                  <textarea"""

content = content.replace(old_textarea_label, new_textarea_label)

old_iframe_wrapper = """              <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[400px]">"""
new_iframe_wrapper = """              <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[600px] h-full w-full">"""

content = content.replace(old_iframe_wrapper, new_iframe_wrapper)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
