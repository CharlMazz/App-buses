import React, {useState} from 'react';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Compass,
  Monitor,
  Plus,
  QrCode,
  Route,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {formatCOP} from '../data/barranquillaTransit';
import type {ScreenId} from '../types/transit';

interface PassengerBottomNavProps {
  currentScreen: 'mapa' | 'rutas' | 'billetera';
  balance: number;
  onNavigate: (screen: ScreenId) => void;
  onCurrentMapAction?: () => void;
  onCurrentWalletAction?: () => void;
  positionClass?: string;
}

export function PassengerBottomNav({
  currentScreen,
  balance,
  onNavigate,
  onCurrentMapAction,
  onCurrentWalletAction,
  positionClass = 'relative shrink-0',
}: PassengerBottomNavProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const tripsCount = Math.floor(balance / 3100);

  return (
    <>
      {fabMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setFabMenuOpen(false)}
          className="absolute inset-0 z-30 bg-slate-900/25 backdrop-blur-[1px]"
        />
      )}

      {/* Bottom App Shell Navigation Bar */}
      <nav
        aria-label="Navegación principal"
        className={`${positionClass} z-40 bg-white border-t border-slate-200 px-3 pt-1.5 pb-2.5 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]`}
      >
        <ul className="flex items-center justify-between max-w-lg mx-auto gap-1">
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setFabMenuOpen(false);
                if (currentScreen !== 'mapa') onNavigate('mapa');
              }}
              aria-current={currentScreen === 'mapa' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-2 ${
                currentScreen === 'mapa'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[11px]">Explorar</span>
            </button>
          </li>
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setFabMenuOpen(false);
                if (currentScreen !== 'rutas') onNavigate('rutas');
              }}
              aria-current={currentScreen === 'rutas' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-2 ${
                currentScreen === 'rutas'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Route className="w-5 h-5" />
              <span className="text-[11px]">Rutas</span>
            </button>
          </li>
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setFabMenuOpen(false);
                if (currentScreen !== 'billetera') onNavigate('billetera');
              }}
              aria-current={currentScreen === 'billetera' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-2 ${
                currentScreen === 'billetera'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-[11px]">Billetera</span>
            </button>
          </li>
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setFabMenuOpen(false);
                setShowProfileModal(true);
              }}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-2"
            >
              <User className="w-5 h-5" />
              <span className="text-[11px]">Perfil</span>
            </button>
          </li>
          <li className="relative shrink-0 pl-1 flex items-center justify-end">
            {fabMenuOpen && (
              <ul className="absolute right-0 bottom-full mb-5 flex flex-col items-end gap-2">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setFabMenuOpen(false);
                      setShowRolesModal(true);
                    }}
                    className="flex items-center gap-2.5 group whitespace-nowrap"
                  >
                    <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                      Roles
                    </span>
                    <span className="w-11 h-11 rounded-full bg-white text-slate-700 group-hover:text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                      <Users className="w-5 h-5" />
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setFabMenuOpen(false);
                      if (currentScreen === 'billetera') {
                        onCurrentWalletAction?.();
                      } else {
                        onNavigate('billetera');
                      }
                    }}
                    className="flex items-center gap-2.5 group whitespace-nowrap"
                  >
                    <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                      Billetera ({formatCOP(balance)})
                      {currentScreen === 'billetera' ? ' (Actual)' : ''}
                    </span>
                    <span
                      className={`w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-colors ${
                        currentScreen === 'billetera'
                          ? 'text-[#0D9488]'
                          : 'text-slate-700 group-hover:text-[#0D9488]'
                      }`}
                    >
                      <Wallet className="w-5 h-5" />
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setFabMenuOpen(false);
                      if (currentScreen !== 'rutas') onNavigate('rutas');
                    }}
                    className="flex items-center gap-2.5 group whitespace-nowrap"
                  >
                    <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                      Rutas{currentScreen === 'rutas' ? ' (Actual)' : ''}
                    </span>
                    <span
                      className={`w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-colors ${
                        currentScreen === 'rutas'
                          ? 'text-[#0D9488]'
                          : 'text-slate-700 group-hover:text-[#0D9488]'
                      }`}
                    >
                      <Route className="w-5 h-5" />
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setFabMenuOpen(false);
                      if (currentScreen === 'mapa') {
                        onCurrentMapAction?.();
                      } else {
                        onNavigate('mapa');
                      }
                    }}
                    className="flex items-center gap-2.5 group whitespace-nowrap"
                  >
                    <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                      Explorar mapa{currentScreen === 'mapa' ? ' (Actual)' : ''}
                    </span>
                    <span
                      className={`w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-colors ${
                        currentScreen === 'mapa'
                          ? 'text-[#0D9488]'
                          : 'text-slate-700 group-hover:text-[#0D9488]'
                      }`}
                    >
                      <Compass className="w-5 h-5" />
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setFabMenuOpen(false);
                      if (currentScreen === 'billetera') {
                        onCurrentWalletAction?.();
                      } else {
                        onNavigate('billetera');
                      }
                    }}
                    className="flex items-center gap-2.5 group whitespace-nowrap"
                  >
                    <span className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg">
                      Ticket QR
                    </span>
                    <span className="w-11 h-11 rounded-full bg-[#0D9488] text-white shadow-lg border-2 border-white flex items-center justify-center">
                      <QrCode className="w-5 h-5" />
                    </span>
                  </button>
                </li>
              </ul>
            )}

            <button
              type="button"
              onClick={() => setFabMenuOpen((open) => !open)}
              aria-expanded={fabMenuOpen}
              aria-label={fabMenuOpen ? 'Cerrar menú rápido' : 'Abrir menú de acciones'}
              className={`-mt-6 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg border-[3px] border-white active:scale-95 transition-all cursor-pointer ${
                fabMenuOpen ? 'bg-slate-900' : 'bg-[#0D9488] hover:bg-teal-700'
              }`}
            >
              <Plus
                className={`w-6 h-6 transition-transform duration-200 ${
                  fabMenuOpen ? 'rotate-45' : ''
                }`}
              />
            </button>
          </li>
        </ul>
      </nav>

      {/* Role Switcher Modal */}
      {showRolesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0D9488]" />
                <h3 className="font-headline text-base font-bold text-slate-900">
                  Ecosistema APP BUSES
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRolesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Selecciona el rol de la plataforma para validar el recorrido completo:
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setShowRolesModal(false)}
                className="w-full text-left p-3 rounded-lg border-2 border-[#0D9488] bg-teal-50/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">App Pasajero (Actual)</p>
                    <p className="text-[11px] text-slate-500">
                      Explorar Mapa, Rutas y Billetera Digital
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRolesModal(false);
                  onNavigate('conductor');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bus className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">App Conductor (Tableta)</p>
                    <p className="text-[11px] text-slate-500">
                      Navegación, Validador QR y Conteo APC
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRolesModal(false);
                  onNavigate('operador');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Centro de Control (Operador Web)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Telemetría de Flota, Recaudo e Incidencias
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

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
