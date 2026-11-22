import type {PlacePoint} from '../types/transit';
import type {TripMatchResult} from './tripRouteMatcher';

export type VoicePlaybackStatus = 'idle' | 'loading' | 'speaking' | 'blocked';

export interface VoiceTripSummary {
  id: number;
  originAddress: string;
  destinationAddress: string;
  routesHeadline: string;
  spokenText: string;
}

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

const SPANISH_LETTER_NAMES: Record<string, string> = {
  A: 'a',
  B: 'be',
  C: 'ce',
  D: 'de',
  E: 'e',
  F: 'efe',
  G: 'ge',
  H: 'hache',
  I: 'i',
  J: 'jota',
  K: 'ka',
  L: 'ele',
  M: 'eme',
  N: 'ene',
  Ñ: 'eñe',
  O: 'o',
  P: 'pe',
  Q: 'cu',
  R: 'erre',
  S: 'ese',
  T: 'te',
  U: 'u',
  V: 'uve',
  W: 'doble u',
  X: 'equis',
  Y: 'ye',
  Z: 'zeta',
};

const LATAM_LOCALE_PRIORITY = [
  'es-419',
  'es-co',
  'es-mx',
  'es-us',
  'es-ar',
  'es-cl',
  'es-pe',
  'es-ve',
  'es-ec',
  'es-pa',
  'es-do',
  'es-gt',
  'es-cr',
  'es-uy',
  'es-py',
  'es-bo',
  'es-pr',
];

let sharedAudioEl: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentAbort: AbortController | null = null;
let currentRunId = 0;

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!sharedAudioEl) {
    sharedAudioEl = new Audio();
    sharedAudioEl.preload = 'auto';
  }
  return sharedAudioEl;
}

function revokeCurrentUrl() {
  if (currentObjectUrl) {
    try {
      URL.revokeObjectURL(currentObjectUrl);
    } catch {
      // Ignore revoke errors
    }
    currentObjectUrl = null;
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], {type: mimeType || 'audio/wav'});
}

export function cleanAddressForDisplayAndSpeech(raw: string): string {
  return raw
    .replace(/,\s*Área metropolitana de,?/gi, ',')
    .replace(/,\s*Barranquilla,\s*Atlántico(?:,\s*Colombia)?$/i, '')
    .replace(/,\s*Atlántico(?:,\s*Colombia)?$/i, '')
    .replace(/,\s*Barranquilla(?:,\s*Colombia)?$/i, '')
    .replace(/,\s*Colombia$/i, '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatPlaceForConfirmation(
  place: PlacePoint | null,
  fallbackLabel?: string
): string {
  if (!place) {
    return fallbackLabel?.trim() || 'tu ubicación actual en Barranquilla';
  }
  const name = place.name.trim();
  const addr = cleanAddressForDisplayAndSpeech(place.address || '');
  const genericAddr =
    !addr ||
    /^barranquilla(?:,\s*atl[aá]ntico)?$/i.test(addr) ||
    addr.toLowerCase() === name.toLowerCase();

  if (genericAddr) {
    return name;
  }

  const normName = name.toLowerCase();
  const normAddr = addr.toLowerCase();
  if (normAddr.includes(normName)) {
    return addr;
  }
  if (normName.includes(normAddr)) {
    return name;
  }
  return `${name}, ${addr}`;
}

function spellLettersForSpanishSpeech(token: string): string {
  return token
    .toUpperCase()
    .split('')
    .map((ch) => SPANISH_LETTER_NAMES[ch] ?? ch.toLowerCase())
    .join(' ');
}

export function formatRouteCodeForSpanishSpeech(code: string): string {
  const parts = code
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);

  const spokenParts = parts.map((part) => {
    // Pure digits
    if (/^\d+$/.test(part)) {
      return part;
    }
    // Single or multi-letter segment (e.g. A, B, U, M)
    if (/^[A-Za-zÑñ]+$/.test(part)) {
      return spellLettersForSpanishSpeech(part);
    }
    // Mixed letters and digits (e.g. D6, A4, C16, B17M, T01)
    return part
      .replace(/([A-Za-zÑñ]+)(\d+)/g, (_m, letters: string, digits: string) => {
        return `${spellLettersForSpanishSpeech(letters)} ${digits}`;
      })
      .replace(/(\d+)([A-Za-zÑñ]+)/g, (_m, digits: string, letters: string) => {
        return `${digits} ${spellLettersForSpanishSpeech(letters)}`;
      })
      .trim();
  });

  return spokenParts.join(', ');
}

export function toSpanishPlaceAndTitleSpeech(raw: string): string {
  return raw
    .replace(/\bCl\.?\s*(?=\d)/gi, 'Calle ')
    .replace(/\bCll\.?\s*(?=\d)/gi, 'Calle ')
    .replace(/\bCra\.?\s*(?=\d)/gi, 'Carrera ')
    .replace(/\bKr\.?\s*(?=\d)/gi, 'Carrera ')
    .replace(/\bKrr\.?\s*(?=\d)/gi, 'Carrera ')
    .replace(/\bAv\.?\s+/gi, 'Avenida ')
    .replace(/\bDg\.?\s*(?=\d)/gi, 'Diagonal ')
    .replace(/\bTv\.?\s*(?=\d)/gi, 'Transversal ')
    .replace(/\bTransv\.?\s*(?=\d)/gi, 'Transversal ')
    .replace(/\bNte\.?\b/gi, 'Norte')
    .replace(/\bOte\.?\b/gi, 'Oriente')
    .replace(/\bOcc\.?\b/gi, 'Occidente')
    .replace(/\bHistorico\b/g, 'Histórico')
    .replace(/\bC\.?\s*C\.?\s+/gi, 'Centro Comercial ')
    .replace(/\bKm\.?\s*(?=\d)/gi, 'Kilómetro ')
    .replace(/\bEdif\.?\s+/gi, 'Edificio ')
    .replace(/\bEd\.?\s+/gi, 'Edificio ')
    .replace(/\bUrb\.?\s+/gi, 'Urbanización ')
    .replace(/\bB\/\s*/gi, 'Barrio ')
    .replace(/\bSta\.?\s+/gi, 'Santa ')
    .replace(/\bSto\.?\s+/gi, 'Santo ')
    .replace(/#\s*(\d+)\s*-\s*(\d+)/g, 'número $1, $2')
    .replace(/#\s*(\d+)/g, 'número $1')
    .replace(/\bShopping\s+Center\b/gi, 'Centro Comercial')
    .replace(/\bShopping\s+Mall\b/gi, 'Centro Comercial')
    .replace(/\bMall\b/gi, 'Centro Comercial')
    .replace(/\bUniversity\b/gi, 'Universidad')
    .replace(/\bBus\s+Station\b/gi, 'Estación de Buses')
    .replace(/\bStation\b/gi, 'Estación')
    .replace(/\bAirport\b/gi, 'Aeropuerto')
    .replace(/\bPark\b/gi, 'Parque')
    .replace(/\bCenter\b/gi, 'Centro')
    .replace(/\bStreet\b/gi, 'Calle')
    .replace(/\bAvenue\b/gi, 'Avenida')
    .replace(/\bRoad\b/gi, 'Vía')
    .replace(/\bNorth\b/gi, 'Norte')
    .replace(/\bSouth\b/gi, 'Sur')
    .replace(/\bEast\b/gi, 'Oriente')
    .replace(/\bWest\b/gi, 'Occidente')
    .replace(/\bBeach\b/gi, 'Playa')
    .replace(/\bSquare\b/gi, 'Plaza')
    .replace(/\bCoolitoral\b/gi, 'Coo litoral')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSpanishCompanySpeech(company: string): string {
  return company
    .replace(/\bCoolitoral\b/gi, 'Coo litoral')
    .trim();
}

function getMeaningfulSpanishRouteTitle(routeName: string, routeCode: string): string {
  const cleanName = routeName.trim();
  const normName = cleanName.toLowerCase().replace(/[\s-]+/g, '');
  const normCode = routeCode.trim().toLowerCase().replace(/[\s-]+/g, '');
  if (!cleanName || normName === normCode || normName === `ruta${normCode}`) {
    return '';
  }
  return toSpanishPlaceAndTitleSpeech(cleanName);
}

function formatRouteItemForSpeech(
  routeCode: string,
  routeName: string,
  company: string,
  etaMinutes?: number
): string {
  const spokenCode = formatRouteCodeForSpanishSpeech(routeCode);
  const extraTitle = getMeaningfulSpanishRouteTitle(routeName, routeCode);
  const spokenCompany = toSpanishCompanySpeech(company);
  const titlePart = extraTitle ? `, ${extraTitle},` : '';

  if (typeof etaMinutes === 'number' && etaMinutes > 0) {
    return `ruta ${spokenCode}${titlePart} de ${spokenCompany}, en aproximadamente ${etaMinutes} minutos`;
  }
  return `ruta ${spokenCode}${titlePart} de ${spokenCompany}`;
}

export function buildVoiceTripConfirmation(opts: {
  originLabel: string;
  destinationLabel: string;
  matchResult: TripMatchResult;
}): VoiceTripSummary {
  const {originLabel, destinationLabel, matchResult} = opts;
  const {direct, transfers} = matchResult;

  const spokenOrigin = toSpanishPlaceAndTitleSpeech(originLabel);
  const spokenDestination = toSpanishPlaceAndTitleSpeech(destinationLabel);

  let routesSentence = '';
  let routesHeadline = '';

  if (direct.length === 1) {
    const m = direct[0];
    routesHeadline = `1 ruta directa: ${m.route.code} (${m.route.company})`;
    routesSentence = `Se muestra 1 ruta directa: la ${formatRouteItemForSpeech(
      m.route.code,
      m.route.name,
      m.route.company,
      m.estimatedRideMinutes
    )}.`;
  } else if (direct.length > 1 && direct.length <= 4) {
    const spokenItems = direct.map((m) =>
      formatRouteItemForSpeech(m.route.code, m.route.name, m.route.company)
    );
    const last = spokenItems[spokenItems.length - 1];
    const rest = spokenItems.slice(0, -1).join(', ');
    const codeList = direct.map((m) => m.route.code).join(', ');
    routesHeadline = `${direct.length} rutas directas: ${codeList}`;
    routesSentence = `Se muestran ${direct.length} rutas directas: ${rest}, y ${last}.`;
  } else if (direct.length > 4) {
    const top3 = direct.slice(0, 3);
    const spokenTop = top3.map((m) =>
      formatRouteItemForSpeech(m.route.code, m.route.name, m.route.company)
    );
    const last = spokenTop[spokenTop.length - 1];
    const rest = spokenTop.slice(0, -1).join(', ');
    const remainingCount = direct.length - 3;
    const codeList = top3.map((m) => m.route.code).join(', ');
    routesHeadline = `${direct.length} rutas directas (${codeList} y ${remainingCount} más)`;
    routesSentence = `Se muestran ${direct.length} rutas directas: ${rest}, y ${last}; y ${remainingCount} rutas más en pantalla.`;
  } else if (transfers.length > 0) {
    const top = transfers.slice(0, 2);
    const desc = top
      .map(
        (t) =>
          `${formatRouteCodeForSpanishSpeech(t.firstLeg.code)} de ${toSpanishCompanySpeech(
            t.firstLeg.company
          )} con transbordo a ${formatRouteCodeForSpanishSpeech(
            t.secondLeg.code
          )} de ${toSpanishCompanySpeech(t.secondLeg.company)}`
      )
      .join(', o ');
    routesHeadline = `${transfers.length} ${
      transfers.length === 1 ? 'opción' : 'opciones'
    } con transbordo (${top[0].firstLeg.code} → ${top[0].secondLeg.code})`;
    routesSentence = `No hay rutas directas, pero se muestran ${transfers.length} ${
      transfers.length === 1 ? 'opción' : 'opciones'
    } con transbordo: ${desc}.`;
  } else {
    routesHeadline = 'Sin rutas cercanas a menos de 2 km';
    routesSentence =
      'No se encontraron rutas de bus a menos de dos kilómetros entre estos puntos. Puedes ajustar el pin en el mapa.';
  }

  const spokenText = `Partida confirmada en ${spokenOrigin}. Destino: ${spokenDestination}. ${routesSentence}`;

  return {
    id: Date.now(),
    originAddress: originLabel,
    destinationAddress: destinationLabel,
    routesHeadline,
    spokenText,
  };
}

/**
 * Call synchronously inside user gesture handlers so mobile browsers (Brave/Chrome/Safari)
 * allow async WAV playback once /api/voice-tts finishes generating audio.
 */
export function unlockVoicePlayback(): void {
  const audio = getSharedAudio();
  if (!audio) return;
  try {
    audio.muted = true;
    audio.src = SILENT_WAV_DATA_URI;
    const playPromise = audio.play();
    if (playPromise) {
      void playPromise
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    } else {
      audio.muted = false;
    }
  } catch {
    audio.muted = false;
  }
}

export function stopVoiceConfirmation(onStatus?: (status: VoicePlaybackStatus) => void): void {
  currentRunId += 1;
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  if (sharedAudioEl) {
    try {
      sharedAudioEl.onended = null;
      sharedAudioEl.onerror = null;
      sharedAudioEl.pause();
      sharedAudioEl.removeAttribute('src');
      sharedAudioEl.load();
    } catch {
      // Ignore cleanup errors
    }
  }
  revokeCurrentUrl();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speechSynthesis cancel errors
    }
  }
  onStatus?.('idle');
}

function pickLatinSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const locale of LATAM_LOCALE_PRIORITY) {
    const match = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === locale);
    if (match) return match;
  }
  const latamByName = voices.find(
    (v) =>
      /^es/i.test(v.lang) &&
      !/es[-_]es/i.test(v.lang) &&
      !/spain|españa|castellano/i.test(v.name)
  );
  if (latamByName) return latamByName;

  return voices.find((v) => /^es/i.test(v.lang)) ?? null;
}

function speakWithBrowserSpeech(
  text: string,
  runId: number,
  onStatus?: (status: VoicePlaybackStatus) => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const preferredVoice = pickLatinSpanishVoice(voices);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = 'es-419';
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    let started = false;
    utterance.onstart = () => {
      if (runId !== currentRunId) return;
      started = true;
      onStatus?.('speaking');
    };
    utterance.onend = () => {
      if (runId !== currentRunId) return;
      onStatus?.('idle');
    };
    utterance.onerror = () => {
      if (runId !== currentRunId) return;
      onStatus?.(started ? 'idle' : 'blocked');
    };

    synth.speak(utterance);
    onStatus?.('speaking');
    return true;
  } catch {
    return false;
  }
}

const ttsAudioCache = new Map<string, {audioBase64: string; mimeType: string}>();

function getCachedTtsAudio(text: string) {
  return ttsAudioCache.get(text) ?? null;
}

function setCachedTtsAudio(text: string, audioBase64: string, mimeType: string) {
  if (ttsAudioCache.size >= 8) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (oldestKey) ttsAudioCache.delete(oldestKey);
  }
  ttsAudioCache.set(text, {audioBase64, mimeType});
}

async function playWavBase64(
  audioBase64: string,
  mimeType: string,
  cleanText: string,
  runId: number,
  onStatus?: (status: VoicePlaybackStatus) => void
): Promise<void> {
  const audio = getSharedAudio();
  if (!audio) {
    if (!speakWithBrowserSpeech(cleanText, runId, onStatus)) {
      onStatus?.('blocked');
    }
    return;
  }

  const blob = base64ToBlob(audioBase64, mimeType || 'audio/wav');
  revokeCurrentUrl();
  const url = URL.createObjectURL(blob);
  currentObjectUrl = url;

  audio.muted = false;
  audio.src = url;
  audio.onended = () => {
    if (runId !== currentRunId) return;
    revokeCurrentUrl();
    onStatus?.('idle');
  };
  audio.onerror = () => {
    if (runId !== currentRunId) return;
    revokeCurrentUrl();
    if (!speakWithBrowserSpeech(cleanText, runId, onStatus)) {
      onStatus?.('blocked');
    }
  };

  try {
    await audio.play();
    if (runId !== currentRunId) return;
    onStatus?.('speaking');
  } catch {
    revokeCurrentUrl();
    if (!speakWithBrowserSpeech(cleanText, runId, onStatus)) {
      onStatus?.('blocked');
    }
  }
}

export async function speakVoiceConfirmation(
  text: string,
  onStatus?: (status: VoicePlaybackStatus) => void
): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) return;

  stopVoiceConfirmation();
  const runId = ++currentRunId;

  const cached = getCachedTtsAudio(cleanText);
  if (cached) {
    await playWavBase64(cached.audioBase64, cached.mimeType, cleanText, runId, onStatus);
    return;
  }

  onStatus?.('loading');

  const controller = new AbortController();
  currentAbort = controller;
  const timeoutId = window.setTimeout(() => controller.abort(), 13500);

  try {
    const response = await fetch('/api/voice-tts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text: cleanText}),
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    if (currentAbort === controller) currentAbort = null;
    if (runId !== currentRunId) return;

    if (response.ok) {
      const data = (await response.json()) as {audioBase64?: string; mimeType?: string};
      if (runId !== currentRunId) return;

      if (data.audioBase64) {
        const mime = data.mimeType || 'audio/wav';
        setCachedTtsAudio(cleanText, data.audioBase64, mime);
        await playWavBase64(data.audioBase64, mime, cleanText, runId, onStatus);
        return;
      }
    }
  } catch {
    window.clearTimeout(timeoutId);
    if (currentAbort === controller) currentAbort = null;
    if (runId !== currentRunId) return;
  }

  // Fallback to native browser SpeechSynthesis if Gemini TTS was unavailable or timed out
  if (!speakWithBrowserSpeech(cleanText, runId, onStatus)) {
    onStatus?.('blocked');
  }
}
