import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  LocateFixed,
  MapPin,
  Mic,
  Navigation,
  RefreshCw,
  Square,
  X,
} from 'lucide-react';
import {
  BARRANQUILLA_PASSENGER_CENTER,
  TRANSIT_STATIONS,
  getDistanceMeters,
} from '../data/barranquillaTransit';
import {resolvePlaceFromText} from '../hooks/useAutocompleteSuggestions';
import type {LatLng, PlacePoint, ScreenId, TripPlannerState} from '../types/transit';

type ModalPhase = 'recording' | 'processing' | 'review';

interface VoiceTripApiResponse {
  transcript: string;
  originText: string | null;
  useCurrentLocation: boolean;
  destinationText: string | null;
  needsClarification: boolean;
  clarificationMessage: string | null;
  error?: string;
}

interface VoiceTripModalProps {
  isOpen: boolean;
  currentScreen: ScreenId;
  tripPlanner: TripPlannerState;
  onNavigate: (screen: ScreenId) => void;
  onClose: () => void;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function pickSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el audio grabado'));
    reader.readAsDataURL(blob);
  });
}

function getQuickCurrentPosition(fallback: LatLng): Promise<LatLng> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(fallback);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const candidate: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        if (getDistanceMeters(candidate, BARRANQUILLA_PASSENGER_CENTER) <= 60000) {
          resolve(candidate);
        } else {
          resolve(fallback);
        }
      },
      () => resolve(fallback),
      {enableHighAccuracy: true, timeout: 2200, maximumAge: 60000}
    );
  });
}

const MAX_RECORDING_SECONDS = 20;
const BAR_COUNT = 18;

export function VoiceTripModal({
  isOpen,
  currentScreen,
  tripPlanner,
  onNavigate,
  onClose,
}: VoiceTripModalProps) {
  const placesLib = useMapsLibrary('places');

  const [phase, setPhase] = useState<ModalPhase>('recording');
  const [statusLabel, setStatusLabel] = useState('Escuchando tu voz...');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.18));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review / editable fallback state
  const [transcript, setTranscript] = useState('');
  const [useGpsOrigin, setUseGpsOrigin] = useState(true);
  const [originInput, setOriginInput] = useState('');
  const [destInput, setDestInput] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelCaptureRef = useRef(false);
  const isMountedRef = useRef(true);

  const {
    userPosition,
    setOriginMarker,
    setOriginQuery,
    setSelectedDestination,
    setDestQuery,
    onUpdateUserPosition,
    onFocusMap,
    onTripSubmitted,
    onToast,
  } = tripPlanner;

  const cleanupAudioHardware = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop errors if stream already closed
      }
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const resolvePlaceQuery = useCallback(
    async (query: string, biasOrigin: LatLng): Promise<PlacePoint | null> => {
      const cleaned = query.trim();
      if (cleaned.length < 2) return null;

      const norm = normalizeText(cleaned);
      const stationMatch = TRANSIT_STATIONS.find((st) => {
        const stNorm = normalizeText(st.name);
        const subNorm = normalizeText(st.subtitle);
        return (
          stNorm.includes(norm) ||
          norm.includes(stNorm) ||
          subNorm.includes(norm)
        );
      });
      if (stationMatch) {
        return {
          name: stationMatch.name,
          address: stationMatch.subtitle,
          position: stationMatch.position,
        };
      }

      if (!placesLib) return null;
      return resolvePlaceFromText(placesLib, cleaned, biasOrigin);
    },
    [placesLib]
  );

  const applyAndLaunchTrip = useCallback(
    async (opts: {
      originText: string | null;
      useCurrentLocation: boolean;
      destinationText: string | null;
      heardTranscript: string;
      clarificationMessage: string | null;
      needsClarification: boolean;
    }) => {
      const {
        originText,
        useCurrentLocation,
        destinationText,
        heardTranscript,
        clarificationMessage,
        needsClarification,
      } = opts;

      setTranscript(heardTranscript);
      setUseGpsOrigin(useCurrentLocation || !originText);
      setOriginInput(originText ?? '');
      setDestInput(destinationText ?? '');

      if (needsClarification || !destinationText) {
        setErrorMessage(
          clarificationMessage ??
            'Indica a qué lugar de Barranquilla quieres ir para buscar las rutas.'
        );
        setPhase('review');
        return;
      }

      setPhase('processing');
      setStatusLabel('Ubicando partida y destino en Barranquilla...');

      let resolvedOrigin: PlacePoint | null = null;
      let activeStartPos = userPosition;

      if (useCurrentLocation || !originText) {
        activeStartPos = await getQuickCurrentPosition(userPosition);
        onUpdateUserPosition(activeStartPos);
      } else {
        resolvedOrigin = await resolvePlaceQuery(originText, userPosition);
        if (!resolvedOrigin) {
          setErrorMessage(
            `No logré ubicar el punto de partida «${originText}» en Barranquilla. Edítalo o usa tu ubicación GPS.`
          );
          setPhase('review');
          return;
        }
        activeStartPos = resolvedOrigin.position;
      }

      const resolvedDest = await resolvePlaceQuery(destinationText, activeStartPos);
      if (!resolvedDest) {
        setErrorMessage(
          `No logré ubicar el destino «${destinationText}» en Barranquilla. Ajusta el nombre o dirección abajo.`
        );
        setPhase('review');
        return;
      }

      if (useCurrentLocation || !resolvedOrigin) {
        setOriginMarker(null);
        setOriginQuery('Mi ubicación actual (GPS)');
      } else {
        setOriginMarker(resolvedOrigin);
        setOriginQuery(resolvedOrigin.name);
      }

      setSelectedDestination(resolvedDest);
      setDestQuery(resolvedDest.name);
      onFocusMap(resolvedDest.position, 15);
      onTripSubmitted();

      if (currentScreen !== 'rutas') {
        onNavigate('rutas');
      }

      const originLabel = resolvedOrigin?.name ?? 'tu ubicación';
      onToast(`Rutas de ${originLabel} a ${resolvedDest.name}`);
      onClose();
    },
    [
      currentScreen,
      onClose,
      onFocusMap,
      onNavigate,
      onToast,
      onTripSubmitted,
      onUpdateUserPosition,
      resolvePlaceQuery,
      setDestQuery,
      setOriginMarker,
      setOriginQuery,
      setSelectedDestination,
      userPosition,
    ]
  );

  const sendToVoiceApi = useCallback(
    async (payload: {audioBase64?: string; mimeType?: string; transcript?: string}) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setErrorMessage(
          'Sin conexión a internet. El dictado por voz necesita red para transcribir y ubicar rutas.'
        );
        setPhase('review');
        return;
      }

      setPhase('processing');
      setErrorMessage(null);
      setStatusLabel(
        payload.audioBase64
          ? 'Transcribiendo tu voz e interpretando recorrido...'
          : 'Interpretando recorrido...'
      );

      try {
        const response = await fetch('/api/voice-trip', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as VoiceTripApiResponse;

        if (!isMountedRef.current) return;

        if (!response.ok) {
          setErrorMessage(
            data.error ?? 'No se pudo procesar tu solicitud de voz. Intenta de nuevo.'
          );
          setPhase('review');
          return;
        }

        await applyAndLaunchTrip({
          originText: data.originText,
          useCurrentLocation: data.useCurrentLocation,
          destinationText: data.destinationText,
          heardTranscript: data.transcript,
          clarificationMessage: data.clarificationMessage,
          needsClarification: data.needsClarification,
        });
      } catch {
        if (!isMountedRef.current) return;
        setErrorMessage(
          'Error de conexión al interpretar tu voz. Verifica tu red e intenta nuevamente.'
        );
        setPhase('review');
      }
    },
    [applyAndLaunchTrip]
  );

  const startRecording = useCallback(async () => {
    cleanupAudioHardware();
    cancelCaptureRef.current = false;
    chunksRef.current = [];
    setErrorMessage(null);
    setElapsedSec(0);
    setPhase('recording');
    setStatusLabel('Escuchando... di dónde estás y a dónde vas');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMessage(
        'Tu navegador no permite grabación directa de micrófono. Escribe tu recorrido abajo (ej. "Estoy en Portal del Prado y voy al Buenavista").'
      );
      setPhase('review');
      return;
    }

    if (!navigator.onLine) {
      setErrorMessage(
        'Estás sin conexión. El dictado por voz requiere conexión a internet.'
      );
      setPhase('review');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!isMountedRef.current || cancelCaptureRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      // Real-time audio visualizer
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext?: typeof AudioContext})
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArr = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArr);
          const nextBars: number[] = [];
          const step = Math.max(1, Math.floor(dataArr.length / BAR_COUNT));
          for (let i = 0; i < BAR_COUNT; i++) {
            const val = dataArr[Math.min(dataArr.length - 1, i * step)] / 255;
            nextBars.push(Math.max(0.14, Math.min(1, val * 1.35)));
          }
          setLevels(nextBars);
          rafRef.current = window.requestAnimationFrame(updateMeter);
        };
        rafRef.current = window.requestAnimationFrame(updateMeter);
      }

      const preferredMime = pickSupportedAudioMimeType();
      const recorder = preferredMime
        ? new MediaRecorder(stream, {mimeType: preferredMime})
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const capturedChunks = [...chunksRef.current];
        const mimeType = recorder.mimeType || preferredMime || 'audio/webm';
        cleanupAudioHardware();

        if (cancelCaptureRef.current || !isMountedRef.current) return;

        if (capturedChunks.length === 0) {
          setErrorMessage('No se capturó audio. Intenta hablar de nuevo.');
          setPhase('review');
          return;
        }

        const audioBlob = new Blob(capturedChunks, {type: mimeType});
        if (audioBlob.size < 400) {
          setErrorMessage('Audio muy corto. Di dónde estás y a dónde quieres ir.');
          setPhase('review');
          return;
        }

        void blobToBase64(audioBlob)
          .then((audioBase64) =>
            sendToVoiceApi({
              audioBase64,
              mimeType,
            })
          )
          .catch(() => {
            if (!isMountedRef.current) return;
            setErrorMessage('No se pudo procesar el audio grabado.');
            setPhase('review');
          });
      };

      recorder.start(250);

      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      cleanupAudioHardware();
      if (!isMountedRef.current) return;
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setErrorMessage(
          'Permiso de micrófono denegado. Habilítalo en tu navegador o escribe tu viaje abajo.'
        );
      } else if (errName === 'NotFoundError') {
        setErrorMessage(
          'No se detectó micrófono disponible. Puedes escribir tu viaje abajo.'
        );
      } else {
        setErrorMessage(
          'No se pudo iniciar el micrófono. Intenta de nuevo o escribe tu origen y destino.'
        );
      }
      setPhase('review');
    }
  }, [cleanupAudioHardware, sendToVoiceApi]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelCaptureRef.current = true;
      cleanupAudioHardware();
    };
  }, [cleanupAudioHardware]);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setOriginInput('');
      setDestInput('');
      setUseGpsOrigin(true);
      setErrorMessage(null);
      void startRecording();
    } else {
      cancelCaptureRef.current = true;
      cleanupAudioHardware();
    }
  }, [isOpen, startRecording, cleanupAudioHardware]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelCaptureRef.current = true;
        cleanupAudioHardware();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, cleanupAudioHardware, onClose]);

  const handleStopAndSubmit = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setPhase('review');
    }
  };

  const handleCancel = () => {
    cancelCaptureRef.current = true;
    cleanupAudioHardware();
    onClose();
  };

  const handleManualReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const destClean = destInput.trim();
    const origClean = originInput.trim();
    const transcriptClean = transcript.trim();

    // If user typed a natural-language sentence in the transcript box without filling destination
    if (!destClean && transcriptClean.length >= 3) {
      await sendToVoiceApi({transcript: transcriptClean});
      return;
    }

    if (!destClean) {
      setErrorMessage('Ingresa o dicta el destino en Barranquilla.');
      return;
    }

    await applyAndLaunchTrip({
      originText: useGpsOrigin || !origClean ? null : origClean,
      useCurrentLocation: useGpsOrigin || !origClean,
      destinationText: destClean,
      heardTranscript: transcriptClean || `${useGpsOrigin ? 'Mi ubicación' : origClean} → ${destClean}`,
      clarificationMessage: null,
      needsClarification: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dictar viaje por voz"
      onClick={handleCancel}
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Mic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-headline text-sm font-bold text-slate-900 truncate">
                Dictar viaje por voz
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Di dónde estás y a dónde quieres ir
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cerrar dictado por voz"
            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {phase === 'recording' && (
            <div className="space-y-4 text-center py-2">
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#0D9488]/20 animate-ping" />
                <span className="relative w-16 h-16 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-lg">
                  <Mic className="w-7 h-7" />
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{statusLabel}</p>
                <p className="font-mono text-xs font-semibold text-[#0D9488] tabular-nums">
                  00:{String(elapsedSec).padStart(2, '0')} / 00:{MAX_RECORDING_SECONDS}
                </p>
              </div>

              {/* Live Waveform Visualizer */}
              <div
                aria-hidden="true"
                className="h-10 flex items-center justify-center gap-1 px-4"
              >
                {levels.map((lvl, idx) => (
                  <span
                    key={idx}
                    style={{height: `${Math.round(lvl * 36)}px`}}
                    className="w-1.5 rounded-full bg-[#0D9488] transition-[height] duration-75"
                  />
                ))}
              </div>

              <div className="px-3 py-2.5 rounded-xl bg-teal-50/70 border border-teal-200/70 text-[11.5px] text-slate-700 leading-relaxed">
                Ej: <strong>«Estoy en el Portal del Prado y quiero ir al Buenavista»</strong> o{' '}
                <strong>«De la Calle 72 con 46 a la Universidad del Norte»</strong>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    cancelCaptureRef.current = true;
                    cleanupAudioHardware();
                    setPhase('review');
                  }}
                  className="flex-1 h-10 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Escribir frase
                </button>
                <button
                  type="button"
                  onClick={handleStopAndSubmit}
                  className="flex-[1.5] h-10 rounded-[12px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current text-teal-400" />
                  <span>Listo · Buscar rutas</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'processing' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{statusLabel}</p>
                {transcript && (
                  <p className="text-xs text-slate-600 italic max-w-xs mx-auto">
                    «{transcript}»
                  </p>
                )}
              </div>
            </div>
          )}

          {phase === 'review' && (
            <form onSubmit={(e) => void handleManualReviewSubmit(e)} className="space-y-3">
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="voice-transcript-input"
                  className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
                >
                  Frase dictada (editable)
                </label>
                <input
                  id="voice-transcript-input"
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Ej. Estoy en la 72 con 46 y voy al Buenavista"
                  className="w-full h-9 px-3 rounded-[10px] bg-slate-100 text-xs text-slate-900 placeholder-slate-500 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="voice-origin-input"
                    className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    <span>Dónde estás (A)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseGpsOrigin((v) => !v);
                      setErrorMessage(null);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold flex items-center gap-1 border transition-colors ${
                      useGpsOrigin
                        ? 'bg-teal-50 text-[#0D9488] border-[#0D9488]'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <LocateFixed className="w-3 h-3" />
                    <span>{useGpsOrigin ? 'Usando mi GPS ✓' : 'Usar mi GPS'}</span>
                  </button>
                </div>
                {!useGpsOrigin && (
                  <input
                    id="voice-origin-input"
                    type="text"
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    placeholder="Ej. Portal del Prado o Calle 72 con 46"
                    className="w-full h-9 px-3 rounded-[10px] bg-slate-100 text-xs text-slate-900 placeholder-slate-500 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="voice-dest-input"
                  className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-[#0D9488]" />
                  <span>A dónde quieres ir (B)</span>
                </label>
                <input
                  id="voice-dest-input"
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  placeholder="Ej. Universidad del Norte, Buenavista..."
                  className="w-full h-9 px-3 rounded-[10px] bg-slate-100 text-xs text-slate-900 placeholder-slate-500 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="flex-1 h-10 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Volver a dictar</span>
                </button>
                <button
                  type="submit"
                  className="flex-[1.4] h-10 rounded-[12px] bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <span>Mostrar rutas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
