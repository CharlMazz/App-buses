import 'dotenv/config';
import express, {type Request, type Response} from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GoogleGenAI, Type} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

function normalizeAudioMimeType(rawMime?: string): string {
  const base = (rawMime ?? 'audio/webm').split(';')[0].trim().toLowerCase();
  if (
    base === 'audio/webm' ||
    base === 'audio/mp4' ||
    base === 'audio/mpeg' ||
    base === 'audio/mp3' ||
    base === 'audio/wav' ||
    base === 'audio/ogg' ||
    base === 'audio/aac' ||
    base === 'audio/flac'
  ) {
    return base === 'audio/mp3' ? 'audio/mpeg' : base;
  }
  return 'audio/webm';
}

interface VoiceTripRequestBody {
  audioBase64?: string;
  mimeType?: string;
  transcript?: string;
}

interface ParsedVoiceTrip {
  transcript: string;
  originText: string | null;
  useCurrentLocation: boolean;
  destinationText: string | null;
  needsClarification: boolean;
  clarificationMessage: string | null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseJsonSafe<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

async function proxyPlacesPost(
  url: string,
  body: Record<string, unknown>,
  fieldMask?: string
): Promise<{status: number; data: unknown}> {
  const mapsKey = getMapsApiKey();
  if (!mapsKey) {
    return {
      status: 503,
      data: {
        error: {
          status: 'MISSING_MAPS_API_KEY',
          message: 'Google Maps API key no configurada en el servidor.',
        },
      },
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': mapsKey,
  };
  if (fieldMask) {
    headers['X-Goog-FieldMask'] = fieldMask;
  }

  const upstream = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const text = await upstream.text();
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {raw: text};
  }
  return {status: upstream.status, data: parsed};
}

async function createApp() {
  const app = express();
  app.use(express.json({limit: '12mb'}));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasMapsKey: Boolean(getMapsApiKey()),
    });
  });

  // Server-side Google Places API (New) proxy fallback (CF1 compliant)
  app.post('/api/places/autocomplete', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        input?: string;
        origin?: {lat: number; lng: number};
        locationRestriction?: {
          rectangle: {
            low: {latitude: number; longitude: number};
            high: {latitude: number; longitude: number};
          };
        };
        locationBias?: {
          circle: {center: {latitude: number; longitude: number}; radius: number};
        };
      };

      const input = typeof body.input === 'string' ? body.input.trim() : '';
      if (input.length < 2) {
        res.json({suggestions: []});
        return;
      }

      const payload: Record<string, unknown> = {
        input,
        includedRegionCodes: ['co'],
        languageCode: 'es',
        regionCode: 'co',
      };
      if (body.origin) {
        payload.origin = {latitude: body.origin.lat, longitude: body.origin.lng};
      }
      if (body.locationRestriction) {
        payload.locationRestriction = body.locationRestriction;
      } else if (body.locationBias) {
        payload.locationBias = body.locationBias;
      }

      const result = await proxyPlacesPost(
        'https://places.googleapis.com/v1/places:autocomplete',
        payload
      );
      res.status(result.status).json(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({error: {message: msg}});
    }
  });

  app.post('/api/places/search-text', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        textQuery?: string;
        locationRestriction?: {
          rectangle: {
            low: {latitude: number; longitude: number};
            high: {latitude: number; longitude: number};
          };
        };
        maxResultCount?: number;
      };
      const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
      if (textQuery.length < 2) {
        res.json({places: []});
        return;
      }

      const payload: Record<string, unknown> = {
        textQuery,
        languageCode: 'es',
        regionCode: 'co',
        maxResultCount: body.maxResultCount ?? 3,
      };
      if (body.locationRestriction) {
        payload.locationRestriction = body.locationRestriction;
      }

      const result = await proxyPlacesPost(
        'https://places.googleapis.com/v1/places:searchText',
        payload,
        'places.id,places.displayName,places.formattedAddress,places.location'
      );
      res.status(result.status).json(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({error: {message: msg}});
    }
  });

  app.post('/api/places/search-nearby', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        center?: {lat: number; lng: number};
        radius?: number;
      };
      if (!body.center) {
        res.status(400).json({error: {message: 'Missing center coordinates'}});
        return;
      }
      const payload = {
        languageCode: 'es',
        regionCode: 'co',
        maxResultCount: 1,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: {latitude: body.center.lat, longitude: body.center.lng},
            radius: body.radius ?? 140,
          },
        },
      };
      const result = await proxyPlacesPost(
        'https://places.googleapis.com/v1/places:searchNearby',
        payload,
        'places.id,places.displayName,places.formattedAddress,places.location'
      );
      res.status(result.status).json(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({error: {message: msg}});
    }
  });

  app.get('/api/places/details', async (req: Request, res: Response) => {
    try {
      const placeId = typeof req.query.placeId === 'string' ? req.query.placeId.trim() : '';
      if (!placeId) {
        res.status(400).json({error: {message: 'Missing placeId'}});
        return;
      }
      const mapsKey = getMapsApiKey();
      if (!mapsKey) {
        res.status(503).json({error: {status: 'MISSING_MAPS_API_KEY', message: 'Missing Maps API key'}});
        return;
      }
      const upstream = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=co`,
        {
          headers: {
            'X-Goog-Api-Key': mapsKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
          },
          signal: AbortSignal.timeout(10000),
        }
      );
      const text = await upstream.text();
      let parsed: unknown = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = {raw: text};
      }
      res.status(upstream.status).json(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({error: {message: msg}});
    }
  });

  app.post('/api/voice-trip', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as VoiceTripRequestBody;
      const rawAudio = typeof body.audioBase64 === 'string' ? body.audioBase64.trim() : '';
      const rawTranscript = typeof body.transcript === 'string' ? body.transcript.trim() : '';

      if (!rawAudio && !rawTranscript) {
        res.status(400).json({
          error: 'Envía un audio grabado o un texto para interpretar el viaje.',
        });
        return;
      }

      const ai = getGeminiClient();
      let transcript = rawTranscript;

      if (rawAudio) {
        const cleanBase64 = rawAudio.includes(',')
          ? rawAudio.slice(rawAudio.indexOf(',') + 1)
          : rawAudio;
        const mimeType = normalizeAudioMimeType(body.mimeType);

        const transcribeResp = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.5-transcribe',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: 'Transcribe este audio en español de Colombia (Barranquilla). El hablante indica dónde está y/o a dónde quiere ir en transporte público (calles, carreras, barrios, estaciones, universidades o centros comerciales). Devuelve únicamente la transcripción exacta en español, sin comillas ni notas.',
                },
              ],
            },
          }),
          18000,
          'transcribe'
        );

        transcript = (transcribeResp.text ?? '').trim();
      }

      if (!transcript) {
        const emptyResult: ParsedVoiceTrip = {
          transcript: '',
          originText: null,
          useCurrentLocation: true,
          destinationText: null,
          needsClarification: true,
          clarificationMessage:
            'No se escuchó voz clara. Habla cerca del micrófono indicando dónde estás y a dónde vas.',
        };
        res.json(emptyResult);
        return;
      }

      const parseResp = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Frase del pasajero en Barranquilla, Colombia:\n"${transcript}"`,
          config: {
            systemInstruction: `Eres un extractor de origen y destino para un sistema de buses urbanos en Barranquilla y su área metropolitana (Soledad, Puerto Colombia, Malambo, Galapa), Colombia.

Analiza lo que dictó el pasajero y devuelve JSON válido con los campos solicitados:
1. useCurrentLocation (boolean): true si el pasajero dice "mi ubicación", "donde estoy", "aquí", "mi posición", o si NO menciona punto de partida (solo indica destino). false si nombra un lugar, dirección o barrio específico donde está.
2. originText (string): Texto limpio del punto de partida listo para buscar en Google Maps en Barranquilla (ej. "Portal del Prado", "Calle 72 con Carrera 46", "Barrio Villa Country"). Devuelve "" si useCurrentLocation es true.
3. destinationText (string): Texto limpio del destino listo para buscar en Google Maps en Barranquilla (ej. "Universidad del Norte", "Centro Comercial Buenavista", "Estadio Metropolitano"). Devuelve "" si no mencionó destino.
4. needsClarification (boolean): true si NO hay un destino comprensible en la frase; false si al menos se entendió el destino.
5. clarificationMessage (string): Mensaje corto y amable en español si needsClarification es true (ej. "Escuché tu punto de partida, pero ¿a qué lugar de Barranquilla quieres ir?"). Devuelve "" si needsClarification es false.

Reglas clave:
- En Barranquilla la gente suele abreviar intersecciones como "la 72 con 46" o "calle 30 con 45". Normaliza de manera natural (ej. "Calle 72 con Carrera 46" cuando corresponda), sin inventar números ni direcciones que el usuario no dijo.
- Nunca inventes coordenadas geográficas ni nombres de lugares ajenos a lo dicho por el usuario.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                originText: {
                  type: Type.STRING,
                  description: 'Punto de partida limpio o cadena vacía si usa ubicación actual.',
                },
                useCurrentLocation: {
                  type: Type.BOOLEAN,
                  description: 'true si parte desde su ubicación GPS actual o no indicó partida.',
                },
                destinationText: {
                  type: Type.STRING,
                  description: 'Lugar de destino limpio o cadena vacía si no se entendió.',
                },
                needsClarification: {
                  type: Type.BOOLEAN,
                  description: 'true si falta el destino para calcular la ruta.',
                },
                clarificationMessage: {
                  type: Type.STRING,
                  description: 'Mensaje breve de aclaración en español o cadena vacía.',
                },
              },
              required: [
                'originText',
                'useCurrentLocation',
                'destinationText',
                'needsClarification',
                'clarificationMessage',
              ],
            },
          },
        }),
        14000,
        'parse'
      );

      const rawJson = (parseResp.text ?? '{}').trim();
      const parsed = parseJsonSafe<{
        originText?: string;
        useCurrentLocation?: boolean;
        destinationText?: string;
        needsClarification?: boolean;
        clarificationMessage?: string;
      }>(rawJson);

      const originClean = (parsed.originText ?? '').trim();
      const destClean = (parsed.destinationText ?? '').trim();
      const clarificationClean = (parsed.clarificationMessage ?? '').trim();
      const useCurrentLocation =
        Boolean(parsed.useCurrentLocation) || originClean.length === 0;
      const needsClarification =
        Boolean(parsed.needsClarification) || destClean.length === 0;

      const result: ParsedVoiceTrip = {
        transcript,
        originText: useCurrentLocation ? null : originClean,
        useCurrentLocation,
        destinationText: destClean || null,
        needsClarification,
        clarificationMessage: needsClarification
          ? clarificationClean ||
            'No logré identificar el destino. Dime a qué lugar o dirección quieres ir.'
          : null,
      };

      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error in /api/voice-trip:', msg);

      if (msg === 'MISSING_GEMINI_API_KEY') {
        res.status(503).json({
          error:
            'El servicio de interpretación por voz no tiene configurada la clave GEMINI_API_KEY en el servidor.',
        });
        return;
      }

      if (msg.startsWith('TIMEOUT:')) {
        res.status(504).json({
          error: `Tiempo de espera agotado al procesar la voz (${msg.slice(8)}). Intenta nuevamente.`,
        });
        return;
      }

      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        res.status(429).json({
          error:
            'Se alcanzó el límite temporal del servicio de voz. Intenta de nuevo en unos segundos.',
        });
        return;
      }

      if (msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('400')) {
        res.status(502).json({
          error:
            'La clave del servicio de voz no tiene permisos o es inválida. Verifica GEMINI_API_KEY en Settings > Secrets.',
        });
        return;
      }

      res.status(500).json({
        error: `No se pudo procesar el audio: ${msg.slice(0, 140)}`,
      });
    }
  });

  app.post('/api/voice-tts', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {text?: string};
      const rawText = typeof body.text === 'string' ? body.text.trim() : '';
      if (!rawText) {
        res.status(400).json({error: 'Falta el texto para sintetizar voz.'});
        return;
      }

      const safeText = rawText.slice(0, 700);
      const ai = getGeminiClient();

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: safeText,
                  speechMetadata: {
                    style:
                      'Voz amable, clara y natural de asistente de transporte público en español colombiano',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {voiceName: 'Kore'},
              },
            },
          },
        }),
        15000,
        'tts'
      );

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({error: 'El servicio de voz no devolvió audio.'});
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: inlineData?.mimeType || 'audio/wav',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error in /api/voice-tts:', msg);

      if (msg === 'MISSING_GEMINI_API_KEY') {
        res.status(503).json({
          error: 'El servicio de voz no tiene configurada GEMINI_API_KEY en el servidor.',
        });
        return;
      }
      if (msg.startsWith('TIMEOUT:')) {
        res.status(504).json({
          error: 'Tiempo de espera agotado al generar confirmación de voz.',
        });
        return;
      }
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        res.status(429).json({
          error: 'Límite temporal del servicio de voz alcanzado.',
        });
        return;
      }
      res.status(502).json({
        error: `No se pudo generar la confirmación de voz: ${msg.slice(0, 140)}`,
      });
    }
  });

  if (!isProduction) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void createApp();
