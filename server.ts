import 'dotenv/config';
import express, {type Request, type Response} from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GoogleGenAI, ThinkingLevel, Type} from '@google/genai';

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

async function createApp() {
  const app = express();
  app.use(express.json({limit: '12mb'}));

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

        const transcribeResp = await ai.models.generateContent({
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
        });

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

      const parseResp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Frase del pasajero en Barranquilla, Colombia:\n"${transcript}"`,
        config: {
          thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
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
      });

      const rawJson = (parseResp.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        originText?: string;
        useCurrentLocation?: boolean;
        destinationText?: string;
        needsClarification?: boolean;
        clarificationMessage?: string;
      };

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

      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        res.status(429).json({
          error:
            'Se alcanzó el límite temporal del servicio de voz. Intenta de nuevo en unos segundos.',
        });
        return;
      }

      res.status(500).json({
        error: 'No se pudo procesar el audio en este momento. Intenta de nuevo o escribe tu ruta.',
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
