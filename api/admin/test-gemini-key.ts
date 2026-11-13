import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export const maxDuration = 30;

const GEMINI_MODEL_CANDIDATES = ['gemini-4-hydrogen', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];

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

async function verifySingleKey(ai: GoogleGenAI) {
  let lastError: any = null;
  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const cfg: any = {};
      if (modelName === 'gemini-4-hydrogen') {
        cfg.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      } else if (modelName === 'gemini-2.5-flash') {
        cfg.thinkingConfig = { thinkingBudget: 0 };
      }
      return await ai.models.generateContent({
        model: modelName,
        contents: 'Sahkan sambungan: balas OK.',
        ...(Object.keys(cfg).length > 0 ? { config: cfg } : {}),
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
  try {
    const body = await request.json().catch(() => ({}));
    const { keys } = body || {};

    let keysToTest: { key: string; source: string; masked: string }[] = [];

    if (keys && typeof keys === 'string' && keys.trim()) {
      keysToTest = parseRawKeys(keys).map((k) => ({
        key: k,
        source: 'Panel Pentadbiran (Admin)',
        masked: maskApiKey(k),
      }));
    }

    if (keysToTest.length === 0) {
      const seen = new Set<string>();
      for (const source of [process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY]) {
        for (const k of parseRawKeys(source)) {
          if (!seen.has(k)) {
            seen.add(k);
            keysToTest.push({
              key: k,
              source: 'Fail Persekitaran (.env)',
              masked: maskApiKey(k),
            });
          }
        }
      }
    }

    if (keysToTest.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tiada kunci API Gemini dimasukkan. Sila taip atau tampal kunci API dalam ruangan kotak teks terlebih dahulu.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const testPromises = keysToTest.map(async (item, i) => {
      try {
        const ai = new GoogleGenAI({
          apiKey: item.key,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Masa tamat sambungan (Timeout > 5s).')), 5000);
        });

        const apiPromise = verifySingleKey(ai);
        apiPromise.catch(() => {});

        const resp = await Promise.race([apiPromise, timeoutPromise]);

        return {
          id: i + 1,
          masked: item.masked,
          source: item.source,
          status: 'Aktif & Sah (Token Berfungsi)',
          success: true,
          sample: resp.text?.slice(0, 30) || 'OK',
        };
      } catch (testErr: any) {
        const rawErr = String(testErr?.message || testErr);
        let userFriendlyStatus = 'Ralat Kunci / Kuota';

        if (rawErr.includes('API_KEY_INVALID') || rawErr.includes('API key not valid')) {
          userFriendlyStatus = 'Kunci Tidak Sah (Invalid API Key)';
        } else if (rawErr.includes('PERMISSION_DENIED') || rawErr.includes('billing')) {
          userFriendlyStatus = 'Sekatan Projek / Perlu Billing';
        } else if (rawErr.includes('RESOURCE_EXHAUSTED') || rawErr.includes('429') || rawErr.includes('quota')) {
          userFriendlyStatus = 'Kuota Harian Habis (Rate Limit 429)';
        } else if (rawErr.includes('Timeout')) {
          userFriendlyStatus = 'Sambungan Perlahan (Timeout)';
        }

        return {
          id: i + 1,
          masked: item.masked,
          source: item.source,
          status: userFriendlyStatus,
          success: false,
          error: rawErr.slice(0, 150),
        };
      }
    });

    const globalTimeout = new Promise<any[]>((resolve) => {
      setTimeout(() => {
        resolve(
          keysToTest.map((item, i) => ({
            id: i + 1,
            masked: item.masked,
            source: item.source,
            status: 'Sambungan Perlahan (Timeout Pelayan)',
            success: false,
            error: 'Pelayan mengambil masa terlalu lama untuk menguji kunci ini.',
          }))
        );
      }, 8000);
    });

    const results = await Promise.race([Promise.all(testPromises), globalTimeout]);

    return new Response(
      JSON.stringify({
        success: true,
        totalTested: results.length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Ralat pelayan semasa menguji kunci',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
