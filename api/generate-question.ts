import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

const GEMINI_MODEL_CANDIDATES = ['gemini-4-hydrogen', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];

let vercelCycleIndex = 0;
let cachedFirestoreKeys: string[] = [];
let lastFirestoreFetchAt = 0;
const FIRESTORE_CACHE_TTL_MS = 30000;

function readFirebaseConfig() {
  const fallback = {
    projectId: 'mineral-actor-450802-f9',
    apiKey: 'AIzaSyBoZYJedGucsSckBDVBZOA3Uvx3KUH94us',
    firestoreDatabaseId: 'ai-studio-c473e287-8d6c-452e-8a47-f0e2ebe17b17',
  };
  try {
    const p = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(p)) {
      return { ...fallback, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
    }
  } catch {}
  return fallback;
}

async function getSharedFirestoreKeys(forceRefresh = false): Promise<string[]> {
  if (!forceRefresh && Date.now() - lastFirestoreFetchAt < FIRESTORE_CACHE_TTL_MS && cachedFirestoreKeys.length > 0) {
    return cachedFirestoreKeys;
  }
  const cfg = readFirebaseConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/admin_settings/gemini_keys?key=${cfg.apiKey}`;
    const resp = await fetch(url, { method: 'GET', signal: controller.signal });
    if (resp.ok) {
      const json: any = await resp.json();
      const rawValues = json?.fields?.keys?.arrayValue?.values;
      const extracted = Array.isArray(rawValues)
        ? rawValues.map((v: any) => v?.stringValue).filter(Boolean)
        : [];
      const cleaned = parseRawKeys(extracted).filter((k) => !k.startsWith('AIzaSyD_TEST'));
      cachedFirestoreKeys = cleaned;
      lastFirestoreFetchAt = Date.now();
      return cleaned;
    }
  } catch {
  } finally {
    clearTimeout(timer);
  }
  return cachedFirestoreKeys;
}

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

function getAvailableKeys(extraKeys?: any, firestoreKeys?: string[]): { key: string; masked: string }[] {
  const result: { key: string; masked: string }[] = [];
  const seen = new Set<string>();

  for (const source of [extraKeys, firestoreKeys, process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY]) {
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

async function generateWithFallback(ai: GoogleGenAI, prompt: string, systemInstruction: string) {
  let lastError: any = null;
  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      return await ai.models.generateContent({
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

function applySinglePatch(html: string, searchRaw: string, replaceRaw: string): { html: string; matched: boolean } {
  const normHtml = html.replace(/\r\n/g, '\n');
  const normSearch = searchRaw.replace(/\r\n/g, '\n');
  const normReplace = replaceRaw.replace(/\r\n/g, '\n');

  const exactIdx = normHtml.indexOf(normSearch);
  if (exactIdx !== -1 && normSearch.length > 0) {
    return {
      html: normHtml.slice(0, exactIdx) + normReplace + normHtml.slice(exactIdx + normSearch.length),
      matched: true,
    };
  }

  const docLines = normHtml.split('\n');
  const searchLines = normSearch.split('\n');
  while (searchLines.length > 0 && searchLines[0].trim() === '') searchLines.shift();
  while (searchLines.length > 0 && searchLines[searchLines.length - 1].trim() === '') searchLines.pop();

  if (searchLines.length === 0) {
    return { html: normHtml, matched: false };
  }

  for (let i = 0; i <= docLines.length - searchLines.length; i++) {
    let allMatch = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (docLines[i + j].trim() !== searchLines[j].trim()) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      const replaceLines = normReplace.split('\n');
      const updatedLines = [...docLines.slice(0, i), ...replaceLines, ...docLines.slice(i + searchLines.length)];
      return { html: updatedLines.join('\n'), matched: true };
    }
  }

  return { html: normHtml, matched: false };
}

function applyAllPatches(baseHtml: string, aiOutput: string): { html: string; appliedCount: number } {
  const cleanedRaw = aiOutput.replace(/```(?:diff|html|txt)?\s*\n?/gi, '').replace(/\n?```\s*$/g, '');
  const blockRegex = /<<<SEARCH[^\n]*\r?\n([\s\S]*?)\r?\n===[^\n]*\r?\n([\s\S]*?)\r?\n>>>/g;
  let currentHtml = baseHtml.replace(/\r\n/g, '\n');
  let appliedCount = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleanedRaw)) !== null) {
    const resPatch = applySinglePatch(currentHtml, match[1], match[2]);
    if (resPatch.matched) {
      currentHtml = resPatch.html;
      appliedCount++;
    }
  }
  return { html: currentHtml, appliedCount };
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

  const { prompt, existingHtml, refinementPrompt, mode, keys: clientKeys } = body || {};
  const isRefineMode =
    mode === 'refine' &&
    typeof existingHtml === 'string' &&
    existingHtml.trim().length > 0 &&
    typeof refinementPrompt === 'string' &&
    refinementPrompt.trim().length > 0;

  if (!isRefineMode && !prompt) {
    return new Response(JSON.stringify({ success: false, error: 'Sila berikan prompt untuk penjanaan soalan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const firestoreKeys = await getSharedFirestoreKeys();
  const pool = getAvailableKeys(clientKeys, firestoreKeys);
  if (pool.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Tiada Kunci API Gemini ditemui. Sila masukkan sekurang-kurangnya satu Kunci API Gemini di Panel Pentadbiran (Admin).',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const systemInstruction = isRefineMode
    ? `Anda ialah pakar penyuntingan kod HTML5/CSS/JS yang sangat tepat (surgical editor).
TUGAS: Kemas kini HANYA bahagian kod HTML sedia ada yang diperlukan untuk memenuhi permintaan penambahbaikan pengguna.
SYARAT WAJIB:
1. JANGAN tulis semula keseluruhan kod jika hanya sebahagian kecil perlu diubah. Kekalkan 100% kod sedia ada yang tidak berkaitan (seperti fungsi window.hantarMarkahKeSistem, tamatkanPermainan, Web Audio API, atau soalan-soalan lain yang tidak diminta untuk ditukar).
2. Pulangkan SATU atau LEBIH blok patch mengikut format TEKSTUAL TEPAT ini (tanpa markdown code fence):
<<<SEARCH
[salin baris kod asal SECARA TEPAT daripada kod sedia ada]
===
[kod gantian yang telah ditambah baik]
>>>
3. Pastikan setiap blok <<<SEARCH cukup unik (sertakan 2-4 baris konteks di sekeliling bahagian yang diubah) dan disalin sebiji-sebiji dari kod asal.`
    : `Anda ialah pakar pembina web interaktif gamifikasi pendidikan KSSM Malaysia bertaraf dunia.
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

  const finalPrompt = isRefineMode
    ? `PERMINTAAN PENAMBAHBAIKAN PENGGUNA:\n"${String(refinementPrompt).trim()}"\n\nKOD HTML SEDIA ADA:\n${existingHtml}\n\nPulangkan blok <<<SEARCH ... === ... >>> untuk mengedit HANYA bahagian yang perlu sahaja.`
    : prompt;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (payload: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {}
      };

      sendEvent({
        type: 'status',
        message: isRefineMode
          ? 'Menganalisis kod sedia ada & mengenal pasti bahagian untuk ditambah baik...'
          : 'Memulakan sambungan pantas ke Gemini AI...',
      });

      const totalKeys = pool.length;
      const startIndex = vercelCycleIndex % totalKeys;
      let lastError: any = null;
      let succeeded = false;

      for (let attempt = 0; attempt < totalKeys; attempt++) {
        const currentIndex = (startIndex + attempt) % totalKeys;
        const currentItem = pool[currentIndex];

        try {
          if (attempt > 0) {
            if (!isRefineMode) {
              sendEvent({
                type: 'reset',
                message: `Menukar ke Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked})...`,
              });
            } else {
              sendEvent({
                type: 'status',
                message: `Menukar ke Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked})...`,
              });
            }
          } else {
            sendEvent({
              type: 'status',
              message: isRefineMode
                ? `Mengedit bahagian berkaitan guna Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked})...`
                : `Menjana kod HTML dengan Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked})...`,
            });
          }

          const ai = new GoogleGenAI({
            apiKey: currentItem.key,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });

          if (isRefineMode) {
            const responseStream = await generateStreamWithFallback(ai, finalPrompt, systemInstruction);
            let fullText = '';
            let processedCursor = 0;
            let workingHtml = String(existingHtml).replace(/\r\n/g, '\n');
            let incrementalApplied = 0;

            for await (const chunk of responseStream) {
              const chunkText = chunk.text || '';
              if (chunkText) {
                fullText += chunkText;
                const pendingSlice = fullText.slice(processedCursor);
                const blockMatch = pendingSlice.match(/<<<SEARCH[^\n]*\r?\n([\s\S]*?)\r?\n===[^\n]*\r?\n([\s\S]*?)\r?\n>>>/);
                if (blockMatch && typeof blockMatch.index === 'number') {
                  const resPatch = applySinglePatch(workingHtml, blockMatch[1], blockMatch[2]);
                  if (resPatch.matched) {
                    workingHtml = resPatch.html;
                    incrementalApplied++;
                    sendEvent({
                      type: 'patch',
                      html: workingHtml,
                      appliedCount: incrementalApplied,
                      keyUsed: currentItem.masked,
                      keyIndex: currentIndex + 1,
                      totalKeys,
                      message: `Menyunting bahagian #${incrementalApplied} secara langsung...`,
                    });
                  }
                  processedCursor += blockMatch.index + blockMatch[0].length;
                } else {
                  sendEvent({
                    type: 'progress',
                    keyUsed: currentItem.masked,
                    keyIndex: currentIndex + 1,
                    totalKeys,
                    message: `Sedang meneliti & menyusun suntingan kod (${fullText.length} aksara dianalisis)...`,
                  });
                }
              }
            }

            let finalHtml = '';
            const patchResult = applyAllPatches(String(existingHtml), fullText);
            if (patchResult.appliedCount > 0) {
              finalHtml = patchResult.html;
            } else {
              const directHtml = extractHtmlCode(fullText);
              if (directHtml.includes('<!DOCTYPE') || directHtml.includes('<html')) {
                finalHtml = directHtml;
              } else {
                sendEvent({
                  type: 'status',
                  message: 'Menyempurnakan penyuntingan bersasar pada kod HTML...',
                });
                const fallbackResp = await generateWithFallback(
                  ai,
                  `Kemas kini kod HTML berikut berdasarkan permintaan: "${String(refinementPrompt).trim()}".\nHanya ubah bahagian yang perlu dan kekalkan bahagian serta fungsi sedia ada seperti window.hantarMarkahKeSistem.\nPulangkan kod HTML lengkap bermula <!DOCTYPE html> hingga </html> sahaja.\n\nKOD ASAL:\n${existingHtml}`,
                  'Pulangkan KOD HTML LENGKAP SAHAJA bermula <!DOCTYPE html> hingga </html> tanpa teks lain. Hanya ubah bahagian yang diminta oleh pengguna.'
                );
                finalHtml = extractHtmlCode(fallbackResp.text || '');
              }
            }

            if (!finalHtml) {
              throw new Error('Gemini AI tidak dapat menyunting kod HTML. Sila cuba lagi.');
            }

            vercelCycleIndex = (currentIndex + 1) % totalKeys;
            sendEvent({
              type: 'done',
              success: true,
              mode: 'refine',
              html: finalHtml,
              keyUsed: currentItem.masked,
              keyIndex: currentIndex + 1,
              totalKeys,
              message: `Penambahbaikan kod HTML berjaya dilaksanakan pada bahagian berkaitan (Kunci #${currentIndex + 1}/${totalKeys} [${currentItem.masked}])!`,
            });
            succeeded = true;
            break;
          }

          const responseStream = await generateStreamWithFallback(ai, finalPrompt, systemInstruction);

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
            mode: 'generate',
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
          error: lastError?.message || 'Semua Kunci API dalam kitaran gagal menjana atau mengedit soalan.',
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
