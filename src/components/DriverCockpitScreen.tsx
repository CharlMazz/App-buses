import React, {useEffect, useState} from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  DoorOpen,
  Flag,
  Headphones,
  Navigation,
  PauseCircle,
  Plus,
  QrCode,
  Radio,
  Signal,
  Siren,
} from 'lucide-react';
import {DRIVER_ROUTE_STOPS, formatCOP} from '../data/barranquillaTransit';
import type {ScreenId} from '../types/transit';
import {QuickAppNav} from './QuickAppNav';

interface DriverCockpitScreenProps {
  balance: number;
  extraPax: number;
  incomingBroadcast: {text: string; nonce: number} | null;
  onSimulateBoarding: () => void;
  onPanicAlert: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export function DriverCockpitScreen({
  balance,
  extraPax,
  incomingBroadcast,
  onSimulateBoarding,
  onPanicAlert,
  onNavigate,
}: DriverCockpitScreenProps) {
  const [stopIdx, setStopIdx] = useState(3); // Estación La Catorce
  const [isPaused, setIsPaused] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [toast, setToast] = useState<{msg: string; icon: 'check' | 'door' | 'pause' | 'radio' | 'qr' | 'warn' | 'flag'} | null>(null);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('es-CO', {hour12: false})
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString('es-CO', {hour12: false}));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!incomingBroadcast) return;
    setToast({
      msg: `Despacho: ${incomingBroadcast.text || 'nuevo comunicado recibido'}`,
      icon: 'radio',
    });
  }, [incomingBroadcast]);

  const maxPax = 80;
  const currentPax = Math.min(maxPax, 34 + extraPax);
  const occupancyPct = Math.round((currentPax / maxPax) * 100);
  const totalValidated = 312 + extraPax;
  const totalRevenue = 967200 + extraPax * 3100;

  const prevStop = DRIVER_ROUTE_STOPS[Math.max(0, stopIdx - 1)];
  const currentStop = DRIVER_ROUTE_STOPS[stopIdx];
  const nextStop = DRIVER_ROUTE_STOPS[Math.min(DRIVER_ROUTE_STOPS.length - 1, stopIdx + 1)];
  const progressPct = Math.round(((stopIdx + 2) / 14) * 100);

  const handleRecordArrival = () => {
    setToast({
      msg: `Arribo confirmado en ${currentStop.name}. Puertas habilitadas.`,
      icon: 'door',
    });
    if (stopIdx < DRIVER_ROUTE_STOPS.length - 1) {
      setStopIdx((i) => i + 1);
    } else {
      setStopIdx(1);
    }
  };

  const handleTogglePause = () => {
    setIsPaused((p) => {
      const next = !p;
      setToast({
        msg: next
          ? 'Turno pausado temporalmente. Notificado al despacho.'
          : 'Turno reanudado en corredor T-01.',
        icon: 'pause',
      });
      return next;
    });
  };

  const handleBoarding = () => {
    if (currentPax < maxPax) {
      onSimulateBoarding();
      setToast({
        msg: `Pasajero abordó. Ticket validado ($3.100 COP). Ocupación: ${currentPax + 1} pax.`,
        icon: 'qr',
      });
    } else {
      setToast({
        msg: 'Capacidad máxima (80 pax) alcanzada.',
        icon: 'warn',
      });
    }
  };

  const handleConfirmPanic = () => {
    setShowPanicModal(false);
    onPanicAlert();
    setToast({
      msg: '¡ALERTA TRANSMITIDA! Autoridades y Centro de Control notificados.',
      icon: 'warn',
    });
  };

  return (
    <div className="relative w-full h-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      <div className="w-full h-full overflow-y-auto p-2.5 sm:p-4 md:p-6 pb-24">
        <div className="max-w-[1360px] mx-auto min-h-full bg-slate-900 rounded-[16px] sm:rounded-[20px] border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Top System Telemetry Bar */}
        <header className="bg-slate-950 border-b border-slate-800 px-5 md:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded bg-[#2563EB] text-white font-headline text-base font-bold">
                T-01
              </span>
              <span className="font-mono text-[13px] font-bold text-teal-400 bg-slate-800 px-3 py-1.5 rounded border border-slate-700">
                BUS #B-304
              </span>
            </div>
            <div className="hidden sm:block border-l border-slate-800 pl-4">
              <p className="text-[11px] text-slate-400">Operador / Conductor</p>
              <p className="text-sm font-semibold text-white">
                Carlos E. Mendoza • Turno 06:00 - 14:00
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-[11px]">
              <Signal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-emerald-400">4G LTE</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-200">GPS OK</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-[11px]">
              <QrCode className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-medium text-teal-300">VALIDADOR ACTIVO</span>
            </div>
            <div className="font-mono text-base font-bold text-white bg-slate-800 px-3.5 py-1.5 rounded border border-slate-700 tabular-nums">
              {clock}
            </div>
          </div>
        </header>

        {/* Main Operational Grid */}
        <main className="flex-1 p-4 md:p-6 grid grid-cols-12 gap-4 md:gap-6 items-stretch">
          {/* Left Column: Driving Navigation & Next Stops */}
          <section
            aria-label="Navegación y Paradas"
            className="col-span-12 lg:col-span-7 flex flex-col justify-between bg-slate-950 rounded-[14px] p-4 md:p-6 border border-slate-800"
          >
            {/* Next Stop Hero Banner */}
            <div className="p-4 md:p-5 rounded-[12px] bg-slate-800 border-l-4 border-[#0D9488] flex items-center justify-between shadow-lg gap-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-teal-400 flex items-center gap-1.5 font-semibold">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>
                    Siguiente Parada • en {currentStop.distanceMeters || 280} metros
                  </span>
                </span>
                <h2 className="font-headline text-2xl text-white font-bold mt-1">
                  {currentStop.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{currentStop.corridor}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-headline text-3xl text-emerald-400 font-mono font-bold tabular-nums">
                  {isPaused ? 'PAUSA' : '1:45'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {isPaused ? 'turno detenido' : 'min restantes'}
                </p>
              </div>
            </div>

            {/* Visual Route Timeline Tracker */}
            <div className="my-6 px-1">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 mb-2.5">
                <span>Progreso de Ruta ({stopIdx + 2} de 14 paradas)</span>
                <span className="text-emerald-400 font-semibold">
                  {isPaused ? 'En pausa' : 'A tiempo (+0 min)'}
                </span>
              </div>

              <div className="relative w-full h-3.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#2563EB] to-[#0D9488] rounded-full transition-all duration-300"
                  style={{width: `${Math.min(100, progressPct)}%`}}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 md:gap-3 mt-4">
                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-center">
                  <span className="font-mono text-[11px] text-slate-400 font-semibold block">
                    ANTERIOR
                  </span>
                  <p className="text-sm font-medium text-slate-300 truncate mt-0.5">
                    {prevStop.name}
                  </p>
                  <span className="font-mono text-[11px] text-emerald-400 font-medium">
                    {prevStop.scheduledTime} ✓
                  </span>
                </div>
                <div className="p-3 rounded bg-teal-950 border border-teal-500 text-center shadow-md">
                  <span className="font-mono text-[11px] text-teal-300 font-bold block">
                    ACTUAL
                  </span>
                  <p className="text-sm font-bold text-white truncate mt-0.5">
                    {currentStop.name}
                  </p>
                  <span className="font-mono text-[11px] text-teal-300 font-semibold">
                    {currentStop.scheduledTime}
                  </span>
                </div>
                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-center">
                  <span className="font-mono text-[11px] text-slate-400 font-semibold block">
                    SIGUIENTE
                  </span>
                  <p className="text-sm font-medium text-slate-300 truncate mt-0.5">
                    {nextStop.name}
                  </p>
                  <span className="font-mono text-[11px] text-slate-400 font-medium">
                    {nextStop.scheduledTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Trip Status Controls (56px Touch Targets) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTogglePause}
                className={`min-h-[56px] py-3.5 px-3 rounded-[14px] font-headline text-sm font-bold flex items-center justify-center gap-2 border active:scale-95 transition-all ${
                  isPaused
                    ? 'bg-amber-950 border-amber-500 text-amber-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <PauseCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="truncate">{isPaused ? 'Reanudar' : 'Pausa Turno'}</span>
              </button>
              <button
                type="button"
                onClick={handleRecordArrival}
                className="min-h-[56px] py-3.5 px-3 rounded-[14px] bg-slate-800 hover:bg-slate-700 text-teal-300 font-headline text-sm font-bold flex items-center justify-center gap-2 border border-teal-500 active:scale-95 transition-all shadow-md"
              >
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                <span className="truncate">Arribo Parada</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setToast({
                    msg: 'Fin de viaje confirmado. Generando informe de cierre.',
                    icon: 'flag',
                  })
                }
                className="min-h-[56px] py-3.5 px-3 rounded-[14px] bg-red-950 hover:bg-red-900 text-red-200 font-headline text-sm font-bold flex items-center justify-center gap-2 border border-red-800 active:scale-95 transition-all"
              >
                <Flag className="w-5 h-5 text-red-400 shrink-0" />
                <span className="truncate">Fin Viaje</span>
              </button>
            </div>
          </section>

          {/* Right Column: Passenger Management & QR Validator */}
          <section
            aria-label="Validación de Pasajeros y Pagos"
            className="col-span-12 lg:col-span-5 flex flex-col justify-between gap-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-col gap-4 flex-1">
              {/* Live Passenger Counting Card */}
              <div className="bg-slate-950 rounded-[14px] p-5 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Ocupación en Vivo (APC)
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[11px] font-bold tabular-nums">
                  {occupancyPct}% CAPACIDAD
                </span>
              </div>

              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <span className="font-headline text-4xl text-white font-bold tabular-nums">
                    {currentPax}
                  </span>
                  <span className="text-slate-400 font-mono text-sm"> / {maxPax} máx</span>
                </div>
                <div className="text-right font-mono text-[11px] tabular-nums">
                  <p className="text-emerald-400 font-bold">+{6 + extraPax} Abordaron</p>
                  <p className="text-slate-400">-2 Bajaron</p>
                </div>
              </div>

              <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{width: `${occupancyPct}%`}}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Sensores de puertas delantera y trasera calibrados</span>
              </p>
            </div>

            {/* Live QR/NFC Payment Scanner Feedback */}
            <div className="flex-1 bg-slate-950 rounded-[14px] p-5 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-mono text-[11px] text-slate-400 font-medium">
                  Última Validación de Pasaje
                </span>
                <span className="font-mono text-[11px] text-emerald-400 font-bold">
                  HACE 4 SEG
                </span>
              </div>

              <div className="p-4 rounded-[12px] bg-emerald-950 border border-emerald-500 flex items-center gap-4 my-2.5">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shrink-0">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-mono text-[11px] text-emerald-300 font-bold">
                    TRANSACCIÓN EXITOSA
                  </p>
                  <h3 className="font-headline text-lg font-bold text-white mt-0.5">
                    $3.100 COP Debitados
                  </h3>
                  <p className="font-mono text-[11px] text-slate-300 mt-0.5">
                    Ticket #TK-BAQ-883492 • Pasajero Validado
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400">Total Pasajeros:</span>
                  <p className="text-base font-bold text-white mt-0.5 tabular-nums">
                    {totalValidated} validados
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Recaudo Digital:</span>
                  <p className="text-base font-bold text-teal-300 mt-0.5 tabular-nums">
                    {formatCOP(totalRevenue)} COP
                  </p>
                </div>
              </div>
            </div>
            </div>

            {/* Emergency / Operator Direct Comms Bar */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setToast({
                    msg: 'Canal de voz abierto con Despacho Central (Frecuencia 4).',
                    icon: 'radio',
                  })
                }
                className="min-h-[56px] py-3.5 px-3 rounded-[14px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-headline text-sm font-bold flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
              >
                <Headphones className="w-5 h-5 text-teal-400" />
                <span>Radio Despacho</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPanicModal(true)}
                className="min-h-[56px] py-3.5 px-3 rounded-[14px] bg-[#DC2626] hover:bg-red-700 text-white font-headline text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Siren className="w-5 h-5" />
                <span>Alerta Pánico</span>
              </button>
            </div>

            {/* Simulation & Role Navigation Bar */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-[12px] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleBoarding}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono text-[11px] font-semibold flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-teal-400" /> Simular Abordaje (+1)
              </button>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>Cambiar Vista:</span>
                <button
                  type="button"
                  onClick={() => onNavigate('rutas')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 underline decoration-teal-400"
                >
                  Pasajero
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onNavigate('operador')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 underline decoration-teal-400"
                >
                  Operador
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Operational Feedback Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-5 py-3.5 rounded-lg border border-teal-500 shadow-2xl flex items-center gap-3 font-mono text-xs max-w-[92vw]">
          {toast.icon === 'door' ? (
            <DoorOpen className="w-5 h-5 text-teal-400 shrink-0" />
          ) : toast.icon === 'pause' ? (
            <PauseCircle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : toast.icon === 'radio' ? (
            <Radio className="w-5 h-5 text-teal-400 shrink-0" />
          ) : toast.icon === 'qr' ? (
            <QrCode className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toast.icon === 'warn' ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          ) : toast.icon === 'flag' ? (
            <Flag className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Panic Emergency Modal */}
      {showPanicModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border-2 border-[#DC2626] rounded-[20px] max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-red-950 border border-[#DC2626] text-red-500 flex items-center justify-center shrink-0">
                <Siren className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-headline text-xl font-bold text-white">
                  ¿Emitir Alerta de Emergencia?
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Se transmitirá señal silenciosa de pánico y coordenadas GPS inmediatas a la
                  Policía Metropolitana y al Centro de Control de Flota BAQ.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-md border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
              <p>
                <strong className="text-white">Unidad:</strong> Bus #B-304 (Troncal T-01)
              </p>
              <p>
                <strong className="text-white">Ubicación:</strong> Cra 46 con Calle 72 (±4m)
              </p>
              <p>
                <strong className="text-white">Pasajeros a bordo:</strong> {currentPax} personas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPanicModal(false)}
                className="min-h-[52px] py-3 px-4 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-headline text-sm font-bold border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPanic}
                className="min-h-[52px] py-3 px-4 rounded-md bg-[#DC2626] hover:bg-red-700 text-white font-headline text-sm font-bold shadow-lg"
              >
                Confirmar Pánico
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <QuickAppNav
        currentScreen="conductor"
        balance={balance}
        onNavigate={onNavigate}
      />
    </div>
  );
}
