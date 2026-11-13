import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export const maxDuration = 60;

const GEMINI_MODEL_CANDIDATES = ['gemini-4-hydrogen', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];

let vercelCycleIndex = 0;

function parseRawKeys(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((k) => String(k).trim()).filter((k) => k.length > 5);
  }
  return String(input)
    .split(/[\n,\r\s;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '******';
  return key.slice(0, 7) + '...' + key.slice(-4);
}

function getAvailableKeys(extraKeys?: any): { key: string; masked: string }[] {
  const result: { key: string; masked: string }[] = [];
  const seen = new Set<string>();

  for (const source of [extraKeys, process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY]) {
    for (const k of parseRawKeys(source)) {
      if (!seen.has(k)) {
        seen.add(k);
        result.push({ key: k, masked: maskApiKey(k) });
      }
    }
  }
  return result;
}

function buildModelConfig(modelName: string, systemInstruction: string) {
  const cfg: any = { systemInstruction };
  if (modelName === 'gemini-4-hydrogen') {
    cfg.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  } else if (modelName === 'gemini-2.5-flash') {
    cfg.thinkingConfig = { thinkingBudget: 0 };
  }
  return cfg;
}

function extractHtmlCode(rawText: string): string {
  let htmlCode = rawText || '';
  if (htmlCode.includes('```html')) {
    const match = htmlCode.match(/```html\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      htmlCode = match[1];
    }
  } else if (htmlCode.includes('```')) {
    const match = htmlCode.match(/```\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      htmlCode = match[1];
    }
  }
  return htmlCode.replace(/^```html\s*\n?/i, '').replace(/```\s*$/, '').trim();
}

async function generateStreamWithFallback(ai: GoogleGenAI, prompt: string, systemInstruction: string) {
  let lastError: any = null;
  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      return await ai.models.generateContentStream({
        model: modelName,
        contents: prompt,
        config: buildModelConfig(modelName, systemInstruction),
      });
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      const isModelNotFound =
        msg.includes('404') ||
        msg.includes('NOT_FOUND') ||
        msg.includes('not found') ||
        msg.includes('is not supported');
      if (isModelNotFound) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Permintaan JSON tidak sah.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt, keys: clientKeys } = body || {};
  if (!prompt) {
    return new Response(JSON.stringify({ success: false, error: 'Sila berikan prompt untuk penjanaan soalan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pool = getAvailableKeys(clientKeys);
  if (pool.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Tiada Kunci API Gemini ditemui. Sila masukkan sekurang-kurangnya satu Kunci API Gemini di Panel Pentadbiran (Admin).',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const systemInstruction = `Anda ialah pakar pembina web interaktif gamifikasi pendidikan KSSM Malaysia bertaraf dunia.
Tugas anda adalah menjana kod HTML5 lengkap (single-file HTML) berserta CSS (Tailwind CDN https://cdn.tailwindcss.com) dan JavaScript fungsional mengikut arahan prompt pengguna.
Syarat WAJIB:
1. Menghasilkan satu fail HTML yang lengkap dan bersedia untuk diuji serta-merta di dalam iframe.
2. Sertakan sistem gamifikasi seperti skor, animasi butang, interaktiviti visual responsif, dan nyawa (hearts) mengikut jumlah yang diminta dalam prompt.
3. Gunakan Web Audio API sintetik (synthesizer) untuk kesan bunyi atau muzik latar tanpa pautan fail audio luar.
4. MESTI sertakan fungsi penyerahan markah:
function tamatkanPermainan(markahAkhir) {
  if (typeof window.hantarMarkahKeSistem === 'function') {
    window.hantarMarkahKeSistem(markahAkhir);
  } else {
    alert("Permainan Tamat! Markah anda: " + markahAkhir + "%");
  }
}
Dan panggil fungsi ini sebaik sahaja pemain tamat menjawab atau kehabisan nyawa.
5. PULANGKAN KOD HTML SAHAJA. Mulakan terus dengan <!DOCTYPE html> hingga </html>. Jangan letakkan teks sembang sebelum atau selepas kod.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (payload: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {}
      };

      sendEvent({ type: 'status', message: 'Memulakan sambungan pantas ke Gemini AI...' });

      const totalKeys = pool.length;
      const startIndex = vercelCycleIndex % totalKeys;
      let lastError: any = null;
      let succeeded = false;

      for (let attempt = 0; attempt < totalKeys; attempt++) {
        const currentIndex = (startIndex + attempt) % totalKeys;
        const currentItem = pool[currentIndex];

        try {
          if (attempt > 0) {
            sendEvent({
              type: 'reset',
              message: `Menukar ke Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked})...`,
            });
          } else {
            sendEvent({
              type: 'status',
              message: `Menjana kod HTML dengan Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked})...`,
            });
          }

          const ai = new GoogleGenAI({
            apiKey: currentItem.key,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });

          const responseStream = await generateStreamWithFallback(ai, prompt, systemInstruction);

          let fullText = '';
          for await (const chunk of responseStream) {
            const chunkText = chunk.text || '';
            if (chunkText) {
              fullText += chunkText;
              sendEvent({
                type: 'chunk',
                text: chunkText,
                keyUsed: currentItem.masked,
                keyIndex: currentIndex + 1,
                totalKeys,
              });
            }
          }

          const htmlCode = extractHtmlCode(fullText);
          if (!htmlCode) {
            throw new Error('Gemini AI tidak memulangkan kod HTML yang sah.');
          }

          vercelCycleIndex = (currentIndex + 1) % totalKeys;
          sendEvent({
            type: 'done',
            success: true,
            html: htmlCode,
            keyUsed: currentItem.masked,
            keyIndex: currentIndex + 1,
            totalKeys,
            message: `Soalan interaktif berjaya dijana oleh Gemini AI (Kunci #${currentIndex + 1}/${totalKeys} [${currentItem.masked}])!`,
          });
          succeeded = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (attempt < totalKeys - 1) {
            continue;
          }
        }
      }

      if (!succeeded) {
        sendEvent({
          type: 'error',
          success: false,
          error: lastError?.message || 'Semua Kunci API dalam kitaran gagal menjana soalan.',
        });
      }

      try {
        controller.close();
      } catch {}
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
