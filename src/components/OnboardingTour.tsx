import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  QrCode,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type {ScreenId} from '../types/transit';

export const TOUR_STORAGE_KEY = 'app_buses_baq_tour_v1_completed';

interface TourStep {
  id: string;
  screen: 'rutas' | 'billetera' | 'qr';
  selectors: string[];
  category: string;
  title: string;
  description: string;
  icon: 'mic' | 'wallet' | 'qr' | 'users';
  actionLabel?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'voice-dictation',
    screen: 'rutas',
    selectors: ['[data-tour="voice-dictation-pill"]', '[data-tour="voice-dictation-fab"]'],
    category: 'Dictado por voz',
    title: 'Dicta tu viaje sin escribir',
    description:
      'Toca «Dictar viaje» y di dónde estás y a dónde vas (por ejemplo: «Estoy en Portal del Prado y voy al Buenavista»). Verás las rutas en el mapa y una voz en español confirmará partida, destino y líneas.',
    icon: 'mic',
    actionLabel: 'Probar dictado',
  },
  {
    id: 'wallet-balance',
    screen: 'billetera',
    selectors: ['[data-tour="wallet-balance"]'],
    category: 'Billetera digital',
    title: 'Revisa tu saldo y recarga en segundos',
    description:
      'En Billetera consultas tu saldo disponible en pesos, cuántos pasajes completos te rinde y puedes recargar al instante con Nequi, PSE o tarjeta débito.',
    icon: 'wallet',
  },
  {
    id: 'qr-ticket',
    screen: 'qr',
    selectors: ['[data-tour="qr-ticket-box"]'],
    category: 'Billetera QR',
    title: 'Compra y presenta tu Ticket QR',
    description:
      'Aquí generas tu código QR dinámico para abordar el bus. Toca «Comprar pasaje QR» para descontar el valor de tu billetera o «Actualizar QR» para renovar el código.',
    icon: 'qr',
  },
  {
    id: 'qr-group-nfc',
    screen: 'qr',
    selectors: ['[data-tour="qr-group-count"]'],
    category: 'Pasajes grupales y NFC',
    title: 'Paga hasta 3 pasajes en un mismo QR',
    description:
      'Selecciona 1, 2 o 3 pasajes si viajas acompañado y activa la validación sin contacto NFC para acercar tu celular directo al lector del bus.',
    icon: 'users',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourProps {
  isOpen: boolean;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onTryVoiceDictation?: () => void;
  onComplete: () => void;
}

function findVisibleTarget(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const candidates = document.querySelectorAll<HTMLElement>(sel);
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return el;
      }
    }
  }
  return null;
}

export function OnboardingTour({
  isOpen,
  currentScreen,
  onNavigate,
  onTryVoiceDictation,
  onComplete,
}: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({width: 340, height: 240});
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const prevOpenRef = useRef(false);

  const step = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];

  const finishTour = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage quota errors
    }
    if (currentScreen !== 'rutas') {
      onNavigate('rutas');
    }
    onComplete();
  }, [currentScreen, onComplete, onNavigate]);

  // Reset to step 0 when tour opens
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setStepIndex(0);
      setTargetRect(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Ensure the active screen matches the current tour step
  useEffect(() => {
    if (!isOpen) return;
    if (currentScreen !== step.screen) {
      onNavigate(step.screen);
    }
  }, [isOpen, currentScreen, step.screen, onNavigate]);

  const measureTarget = useCallback(() => {
    if (!isOpen) return;
    const el = findVisibleTarget(step.selectors);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [isOpen, step.selectors]);

  // Scroll target into view when step changes & track resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const locateAndScroll = () => {
      if (cancelled) return;
      const el = findVisibleTarget(step.selectors);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 16 || r.bottom > window.innerHeight - 16) {
          el.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'smooth'});
        }
        measureTarget();
      } else {
        setTargetRect(null);
      }
    };

    const t1 = window.setTimeout(locateAndScroll, 40);
    const t2 = window.setTimeout(measureTarget, 220);
    const t3 = window.setTimeout(measureTarget, 450);

    const onViewportChange = () => measureTarget();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [isOpen, stepIndex, currentScreen, step.selectors, measureTarget]);

  // Measure rendered tooltip height for exact collision-free placement
  useLayoutEffect(() => {
    if (!isOpen || !tooltipRef.current) return;
    const r = tooltipRef.current.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      setTooltipSize({width: r.width, height: r.height});
    }
  }, [isOpen, stepIndex, targetRect]);

  // Keyboard navigation (Escape, ArrowRight, ArrowLeft)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishTour();
      } else if (e.key === 'ArrowRight') {
        if (stepIndex < TOUR_STEPS.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          finishTour();
        }
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, stepIndex, finishTour]);

  if (!isOpen) return null;

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 390;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 844;

  const pad = 8;
  const spot = targetRect
    ? {
        top: Math.max(4, targetRect.top - pad),
        left: Math.max(4, targetRect.left - pad),
        width: Math.min(viewportW - 8, targetRect.width + pad * 2),
        height: Math.min(viewportH - 8, targetRect.height + pad * 2),
      }
    : null;

  const cardWidth = Math.min(360, viewportW - 24);
  const cardHeight = tooltipSize.height || 235;

  let cardTop = Math.max(16, Math.round((viewportH - cardHeight) / 2));
  let cardLeft = Math.max(12, Math.round((viewportW - cardWidth) / 2));
  let placement: 'below' | 'above' | 'docked' = 'docked';
  let arrowLeft = cardWidth / 2;

  if (spot) {
    const spotBottom = spot.top + spot.height;
    const spaceBelow = viewportH - spotBottom - 16;
    const spaceAbove = spot.top - 16;

    if (spaceBelow >= cardHeight + 12) {
      placement = 'below';
      cardTop = spotBottom + 12;
    } else if (spaceAbove >= cardHeight + 12) {
      placement = 'above';
      cardTop = spot.top - cardHeight - 12;
    } else {
      placement = 'docked';
      cardTop =
        spaceBelow >= spaceAbove
          ? Math.max(12, viewportH - cardHeight - 14)
          : 14;
    }

    const spotCenterX = spot.left + spot.width / 2;
    cardLeft = Math.max(
      12,
      Math.min(viewportW - cardWidth - 12, Math.round(spotCenterX - cardWidth / 2))
    );
    arrowLeft = Math.max(24, Math.min(cardWidth - 24, spotCenterX - cardLeft));
  }

  const StepIcon =
    step.icon === 'mic'
      ? Mic
      : step.icon === 'wallet'
      ? Wallet
      : step.icon === 'qr'
      ? QrCode
      : Users;

  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
      className="fixed inset-0 z-[70]"
    >
      {/* Click-blocking backdrop (keeps background UI stable during tour) */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 transition-colors duration-200 ${
          spot ? 'bg-transparent' : 'bg-slate-950/65 backdrop-blur-[1px]'
        }`}
      />

      {/* Spotlight Cutout Frame */}
      {spot && (
        <div
          aria-hidden="true"
          style={{
            top: `${spot.top}px`,
            left: `${spot.left}px`,
            width: `${spot.width}px`,
            height: `${spot.height}px`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.68)',
          }}
          className="fixed rounded-[16px] ring-2 ring-[#14B8A6] pointer-events-none transition-[top,left,width,height] duration-200 ease-out"
        />
      )}

      {/* Tooltip Card */}
      <div
        ref={tooltipRef}
        style={{
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardWidth}px`,
        }}
        className="fixed bg-white rounded-[20px] shadow-2xl border border-slate-200 p-4 sm:p-5 space-y-3.5 transition-[top,left] duration-200 ease-out"
      >
        {/* Caret pointing toward spotlight target */}
        {placement === 'below' && (
          <span
            aria-hidden="true"
            style={{left: `${arrowLeft - 6}px`}}
            className="absolute -top-1.5 w-3 h-3 rotate-45 bg-white border-l border-t border-slate-200"
          />
        )}
        {placement === 'above' && (
          <span
            aria-hidden="true"
            style={{left: `${arrowLeft - 6}px`}}
            className="absolute -bottom-1.5 w-3 h-3 rotate-45 bg-white border-r border-b border-slate-200"
          />
        )}

        {/* Header Row: Step Index & Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <StepIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                Paso {stepIndex + 1} de {TOUR_STEPS.length} · {step.category}
              </p>
              <h2
                id="onboarding-tour-title"
                className="font-headline text-[15px] font-bold text-slate-900 leading-snug text-balance"
              >
                {step.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={finishTour}
            aria-label="Cerrar tutorial"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-[13px] leading-relaxed text-slate-600">{step.description}</p>

        {/* Segmented Progress Bar */}
        <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
          {TOUR_STEPS.map((s, idx) => (
            <span
              key={s.id}
              className={`h-1 rounded-full transition-colors ${
                idx <= stepIndex ? 'bg-[#0D9488]' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="min-h-[40px] px-3 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={finishTour}
                className="min-h-[40px] px-3 rounded-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Omitir
              </button>
            )}

            {stepIndex > 0 && (
              <button
                type="button"
                onClick={finishTour}
                className="min-h-[40px] px-2.5 rounded-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Omitir
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {step.actionLabel && onTryVoiceDictation && (
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.setItem(TOUR_STORAGE_KEY, 'true');
                  } catch {
                    // Ignore
                  }
                  onComplete();
                  onTryVoiceDictation();
                }}
                className="min-h-[40px] px-3 rounded-[10px] border border-[#0D9488] text-[#0D9488] hover:bg-teal-50 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {step.actionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  finishTour();
                } else {
                  setStepIndex((i) => i + 1);
                }
              }}
              className="min-h-[40px] px-4 rounded-[10px] bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <span>{isLastStep ? 'Entendido' : 'Siguiente'}</span>
              {!isLastStep && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
