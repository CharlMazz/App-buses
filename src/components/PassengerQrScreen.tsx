import React, {useEffect, useState} from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Nfc,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {formatCOP} from '../data/barranquillaTransit';
import type {ScreenId, TripPlannerState} from '../types/transit';
import {PassengerBottomNav} from './PassengerBottomNav';

interface PassengerQrScreenProps {
  balance: number;
  tripPlanner: TripPlannerState;
  onNavigate: (screen: ScreenId) => void;
}

const FARE_PER_PASSENGER = 3100;

const QR_DATA_CELLS: Array<{x: number; y: number; w: number; h: number; accent?: boolean}> = [
  {x: 42, y: 8, w: 6, h: 6},
  {x: 52, y: 8, w: 8, h: 6},
  {x: 66, y: 8, w: 6, h: 12},
  {x: 42, y: 20, w: 12, h: 6},
  {x: 60, y: 20, w: 6, h: 6, accent: true},
  {x: 72, y: 20, w: 6, h: 6},
  {x: 8, y: 44, w: 6, h: 8},
  {x: 20, y: 44, w: 8, h: 6},
  {x: 34, y: 44, w: 12, h: 12},
  {x: 52, y: 40, w: 16, h: 6, accent: true},
  {x: 74, y: 40, w: 6, h: 10},
  {x: 86, y: 44, w: 14, h: 6},
  {x: 106, y: 44, w: 6, h: 12},
  {x: 8, y: 60, w: 12, h: 6},
  {x: 26, y: 60, w: 6, h: 12, accent: true},
  {x: 38, y: 64, w: 16, h: 6},
  {x: 60, y: 56, w: 10, h: 14},
  {x: 76, y: 60, w: 6, h: 6, accent: true},
  {x: 88, y: 58, w: 14, h: 8},
  {x: 44, y: 82, w: 8, h: 6},
  {x: 58, y: 82, w: 12, h: 8, accent: true},
  {x: 76, y: 80, w: 10, h: 12},
  {x: 92, y: 78, w: 6, h: 12},
  {x: 104, y: 80, w: 8, h: 6},
  {x: 44, y: 96, w: 14, h: 6},
  {x: 64, y: 98, w: 6, h: 12},
  {x: 76, y: 100, w: 14, h: 6, accent: true},
  {x: 96, y: 98, w: 14, h: 12},
];

export function PassengerQrScreen({balance, tripPlanner, onNavigate}: PassengerQrScreenProps) {
  const [ticketCode, setTicketCode] = useState('TK-BAQ-883492');
  const [qrSeed, setQrSeed] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(102);
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [passengerCount, setPassengerCount] = useState<1 | 2 | 3>(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 1 ? s - 1 : 120));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2500);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const formattedTimer = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60
  ).padStart(2, '0')} min`;

  const requiredCop = passengerCount * FARE_PER_PASSENGER;
  const hasEnoughBalance = balance >= requiredCop;
  const tripsAvailable = Math.floor(balance / FARE_PER_PASSENGER);

  const handleRefreshQr = (nextCount?: 1 | 2 | 3) => {
    const rnd = Math.floor(100000 + Math.random() * 900000);
    setTicketCode(`TK-BAQ-${rnd}`);
    setQrSeed((s) => s + 1);
    setSecondsLeft(120);
    if (nextCount) {
      setToastMsg(
        `QR actualizado para ${nextCount} ${nextCount === 1 ? 'pasaje' : 'pasajes'}`
      );
    } else {
      setToastMsg('Nuevo código QR dinámico generado');
    }
  };

  return (
    <div className="@container relative w-full h-full bg-[#F8FAFC] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 pt-4 pb-3">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('rutas')}
              aria-label="Volver a rutas"
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-base sm:text-lg font-bold text-slate-900 truncate">
                Ticket QR de Abordaje
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Validador digital Barranquilla · {formatCOP(FARE_PER_PASSENGER)} c/u
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('billetera')}
            className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          >
            <Wallet className="w-4 h-4 text-[#0D9488]" />
            <span>Pagos</span>
          </button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-16">
        <div className="max-w-5xl mx-auto w-full space-y-4 md:space-y-0 md:grid md:grid-cols-12 md:gap-6 items-start">
          {/* Dynamic QR Ticket Card */}
          <section
            aria-label="Ticket Digital Dinámico"
            className="md:col-span-6 relative bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[22px] p-4 sm:p-6 shadow-xl overflow-hidden border border-slate-700"
          >
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#0D9488]/20 rounded-full blur-2xl pointer-events-none" />

            {/* Ticket Header Status */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-[#0D9488] text-white font-mono text-[11px] font-bold shrink-0">
                  QR DINÁMICO
                </span>
                <span className="text-xs text-white/85 truncate">
                  {passengerCount} {passengerCount === 1 ? 'pasaje' : 'pasajes'} ·{' '}
                  {formatCOP(requiredCop)}
                </span>
              </div>
              <div
                className={`flex items-center gap-1.5 font-mono text-[11px] shrink-0 ${
                  hasEnoughBalance ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    hasEnoughBalance ? 'bg-emerald-400' : 'bg-amber-300'
                  }`}
                />
                <span>{hasEnoughBalance ? 'Listo' : 'Saldo bajo'}</span>
              </div>
            </div>

            {/* Dynamic SVG QR Code */}
            <div className="my-4 flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleRefreshQr()}
                aria-label="Tocar para regenerar código QR"
                className="p-3.5 bg-white rounded-xl shadow-inner flex flex-col items-center hover:ring-2 hover:ring-[#14B8A6] transition-all cursor-pointer"
              >
                <svg
                  className="w-44 h-44 sm:w-48 sm:h-48 md:w-56 md:h-56"
                  viewBox="0 0 120 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Finder Squares */}
                  <rect x="5" y="5" width="30" height="30" rx="4" fill="#0F172A" />
                  <rect x="10" y="10" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="15" y="15" width="10" height="10" rx="1" fill="#0D9488" />

                  <rect x="85" y="5" width="30" height="30" rx="4" fill="#0F172A" />
                  <rect x="90" y="10" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="95" y="15" width="10" height="10" rx="1" fill="#0D9488" />

                  <rect x="5" y="85" width="30" height="30" rx="4" fill="#0F172A" />
                  <rect x="10" y="90" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="15" y="95" width="10" height="10" rx="1" fill="#0D9488" />

                  {/* Seed-responsive Data Modules */}
                  {QR_DATA_CELLS.map((cell, idx) => {
                    const useTeal = cell.accent
                      ? (idx + qrSeed + passengerCount) % 2 === 1
                      : (idx + qrSeed + passengerCount) % 5 === 0;
                    const visible = (idx + qrSeed + passengerCount) % 9 !== 0 || cell.accent;
                    if (!visible) return null;
                    return (
                      <rect
                        key={`${cell.x}-${cell.y}-${idx}`}
                        x={cell.x}
                        y={cell.y}
                        width={cell.w}
                        height={cell.h}
                        rx={1}
                        fill={useTeal ? '#0D9488' : '#0F172A'}
                      />
                    );
                  })}
                </svg>
                <span className="font-mono text-[11px] text-slate-600 tracking-widest mt-1.5 font-semibold">
                  {ticketCode}
                </span>
              </button>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/90">
                <button
                  type="button"
                  onClick={() => handleRefreshQr()}
                  className="min-h-[34px] px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1.5 text-teal-300 font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar QR</span>
                </button>
                <span className="text-white/80">
                  Expira:{' '}
                  <strong className="font-mono text-emerald-400 tabular-nums">
                    {formattedTimer}
                  </strong>
                </span>
              </div>
            </div>

            {/* NFC Toggle Row */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-white/80 min-w-0">
                <Nfc className="w-4 h-4 text-[#14B8A6] shrink-0" />
                <span className="truncate">Validación sin contacto NFC</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNfcEnabled((v) => {
                    const next = !v;
                    setToastMsg(
                      next
                        ? 'Antena NFC lista: acerca tu celular al validador'
                        : 'Validación NFC pausada temporalmente'
                    );
                    return next;
                  });
                }}
                className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold active:scale-95 transition-all shrink-0 ${
                  nfcEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {nfcEnabled ? 'HABILITADO' : 'PAUSADO'}
              </button>
            </div>
          </section>

          {/* Right Column / Secondary QR Options */}
          <div className="md:col-span-6 space-y-4">
            {/* Passenger Count Selector for Group Boarding */}
            <section
              aria-label="Pasajes incluidos en el QR"
              className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0D9488]" />
                  <h2 className="font-headline text-sm font-bold text-slate-900">
                    Pasajes en este QR
                  </h2>
                </div>
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {formatCOP(requiredCop)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((count) => {
                  const active = passengerCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setPassengerCount(count);
                        handleRefreshQr(count);
                      }}
                      className={`min-h-[42px] rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-sm'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {count} {count === 1 ? 'pasaje' : 'pasajes'}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                Genera un solo código QR para ti o tus acompañantes al abordar.
              </p>
            </section>

            {/* Linked Wallet Status & Quick Link to Pagos */}
            <section
              aria-label="Saldo respaldado para QR"
              className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Saldo vinculado</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-headline text-xl font-bold text-slate-900 tabular-nums">
                      {formatCOP(balance)}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-500">COP</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Disponible para {tripsAvailable} pasajes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('billetera')}
                  className="min-h-[40px] px-3 py-2 rounded-[10px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Ir a Billetera</span>
                </button>
              </div>
              {!hasEnoughBalance && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
                  Tu saldo actual no cubre {passengerCount} pasajes. Recarga en Billetera antes de
                  validar.
                </div>
              )}
            </section>

            {/* Usage Guidance */}
            <section
              aria-label="Instrucciones de uso del QR"
              className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-200 space-y-2.5"
            >
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                <h2 className="font-headline text-sm font-bold">Cómo validar tu pasaje</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <QrCode className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Muestra el código frente al lector óptico del bus o torniquete.</span>
                </li>
                <li className="flex items-start gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Por seguridad antifraude, el token rota cada 2 minutos.</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <PassengerBottomNav
        currentScreen="qr"
        balance={balance}
        tripPlanner={tripPlanner}
        onNavigate={onNavigate}
        positionClass="relative shrink-0"
      />

      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 max-w-[90%] whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
