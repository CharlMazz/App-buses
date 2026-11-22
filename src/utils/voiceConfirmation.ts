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
    !addr || /^barranquilla(?:,\s*atl[aá]ntico)?$/i.test(addr) || addr.toLowerCase() === name.toLowerCase();

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

function formatRouteItemForSpeech(routeCode: string, company: string, etaMinutes?: number): string {
  const spokenCode = routeCode.replace(/-/g, ' ');
  if (typeof etaMinutes === 'number' && etaMinutes > 0) {
    return `ruta ${spokenCode} de ${company} (aproximadamente ${etaMinutes} minutos)`;
  }
  return `ruta ${spokenCode} de ${company}`;
}

export function buildVoiceTripConfirmation(opts: {
  originLabel: string;
  destinationLabel: string;
  matchResult: TripMatchResult;
}): VoiceTripSummary {
  const {originLabel, destinationLabel, matchResult} = opts;
  const {direct, transfers} = matchResult;

  let routesSentence = '';
  let routesHeadline = '';

  if (direct.length === 1) {
    const m = direct[0];
    routesHeadline = `1 ruta directa: ${m.route.code} (${m.route.company})`;
    routesSentence = `Se muestra 1 ruta directa: la ${formatRouteItemForSpeech(
      m.route.code,
      m.route.company,
      m.estimatedRideMinutes
    )}.`;
  } else if (direct.length > 1 && direct.length <= 4) {
    const spokenItems = direct.map((m) =>
      formatRouteItemForSpeech(m.route.code, m.route.company)
    );
    const last = spokenItems[spokenItems.length - 1];
    const rest = spokenItems.slice(0, -1).join(', ');
    const codeList = direct.map((m) => m.route.code).join(', ');
    routesHeadline = `${direct.length} rutas directas: ${codeList}`;
    routesSentence = `Se muestran ${direct.length} rutas directas: ${rest} y ${last}.`;
  } else if (direct.length > 4) {
    const top3 = direct.slice(0, 3);
    const spokenTop = top3.map((m) =>
      formatRouteItemForSpeech(m.route.code, m.route.company)
    );
    const last = spokenTop[spokenTop.length - 1];
    const rest = spokenTop.slice(0, -1).join(', ');
    const remainingCount = direct.length - 3;
    const codeList = top3.map((m) => m.route.code).join(', ');
    routesHeadline = `${direct.length} rutas directas (${codeList} y ${remainingCount} más)`;
    routesSentence = `Se muestran ${direct.length} rutas directas: ${rest} y ${last}, y ${remainingCount} más en pantalla.`;
  } else if (transfers.length > 0) {
    const top = transfers.slice(0, 2);
    const desc = top
      .map(
        (t) =>
          `${t.firstLeg.code.replace(/-/g, ' ')} de ${t.firstLeg.company} con transbordo a ${t.secondLeg.code.replace(/-/g, ' ')} de ${t.secondLeg.company}`
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

  const spokenText = `Partida confirmada en ${originLabel}. Destino: ${destinationLabel}. ${routesSentence}`;

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
    const preferredVoice =
      voices.find((v) => /^es[-_]CO/i.test(v.lang)) ??
      voices.find((v) => /^es[-_](419|MX|US|ES)/i.test(v.lang)) ??
      voices.find((v) => /^es/i.test(v.lang));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = 'es-CO';
    }
    utterance.rate = 1.02;
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

export async function speakVoiceConfirmation(
  text: string,
  onStatus?: (status: VoicePlaybackStatus) => void
): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) return;

  stopVoiceConfirmation();
  const runId = ++currentRunId;
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
        const audio = getSharedAudio();
        if (audio) {
          const blob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
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
            return;
          } catch {
            // Browser blocked async audio autoplay -> try speechSynthesis or show replay button
            revokeCurrentUrl();
            if (speakWithBrowserSpeech(cleanText, runId, onStatus)) {
              return;
            }
            onStatus?.('blocked');
            return;
          }
        }
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
