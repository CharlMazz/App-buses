import React, {useState} from 'react';
import {
  ArrowRight,
  Bus,
  Compass,
  Monitor,
  QrCode,
  Route,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {formatCOP} from '../data/barranquillaTransit';
import type {ScreenId} from '../types/transit';

interface PassengerBottomNavProps {
  currentScreen: 'mapa' | 'rutas' | 'billetera';
  balance: number;
  onNavigate: (screen: ScreenId) => void;
  onQrAction?: () => void;
  positionClass?: string;
}

export function PassengerBottomNav({
  currentScreen,
  balance,
  onNavigate,
  onQrAction,
  positionClass = 'relative shrink-0',
}: PassengerBottomNavProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const tripsCount = Math.floor(balance / 3100);

  return (
    <>
      {/* Bottom App Shell Navigation Bar */}
      <nav
        aria-label="Navegación principal"
        className={`${positionClass} z-40 bg-white border-t border-slate-200 px-3 pt-2 pb-3 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]`}
      >
        <ul className="flex items-center justify-around max-w-lg mx-auto">
          <li>
            <button
              type="button"
              onClick={() => {
                if (currentScreen !== 'mapa') onNavigate('mapa');
              }}
              aria-current={currentScreen === 'mapa' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-3 ${
                currentScreen === 'mapa'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[11px]">Explorar</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                if (currentScreen !== 'rutas') onNavigate('rutas');
              }}
              aria-current={currentScreen === 'rutas' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-3 ${
                currentScreen === 'rutas'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Route className="w-5 h-5" />
              <span className="text-[11px]">Rutas</span>
            </button>
          </li>
          <li className="-mt-5">
            <button
              type="button"
              onClick={() => {
                if (onQrAction) {
                  onQrAction();
                } else {
                  onNavigate('billetera');
                }
              }}
              aria-label={
                currentScreen === 'billetera' ? 'Actualizar Ticket QR' : 'Abrir Ticket QR'
              }
              className="w-14 h-14 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              <QrCode className="w-7 h-7" />
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                if (currentScreen !== 'billetera') onNavigate('billetera');
              }}
              aria-current={currentScreen === 'billetera' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-3 ${
                currentScreen === 'billetera'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-[11px]">Billetera</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-3"
            >
              <User className="w-5 h-5" />
              <span className="text-[11px]">Perfil</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Passenger Profile & Roles Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0D9488] text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-slate-900">
                    Pasajero Barranquilla
                  </h3>
                  <p className="font-mono text-[11px] text-slate-500">
                    Tarjeta Virtual BAQ • Activa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Saldo disponible</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCOP(balance)} COP ({tripsCount} pasajes)
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  if (currentScreen !== 'mapa') onNavigate('mapa');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Explorar Mapa en Vivo</p>
                    <p className="text-[11px] text-slate-500">Partida, destino y buses cercanos</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  if (currentScreen !== 'rutas') onNavigate('rutas');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Route className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Buscador de Rutas BAQ</p>
                    <p className="text-[11px] text-slate-500">Consultar rutas por zona del mapa</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onNavigate('conductor');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bus className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">App Conductor (Tableta)</p>
                    <p className="text-[11px] text-slate-500">Validador QR y Conteo APC</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onNavigate('operador');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Centro de Control (Operador)
                    </p>
                    <p className="text-[11px] text-slate-500">Telemetría de flota y recaudo</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
