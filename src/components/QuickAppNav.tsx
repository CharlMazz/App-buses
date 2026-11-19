import React, {useState} from 'react';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
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
import {PWAInstallButton} from './PWAInstallButton';

interface QuickAppNavProps {
  currentScreen: ScreenId;
  balance: number;
  onNavigate: (screen: ScreenId) => void;
  onCurrentRoutesAction?: () => void;
  onCurrentWalletAction?: () => void;
  positionClass?: string;
}

export function QuickAppNav({
  currentScreen,
  balance,
  onNavigate,
  onCurrentRoutesAction,
  onCurrentWalletAction,
  positionClass = 'bottom-4 left-4',
}: QuickAppNavProps) {
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);

  const isPassengerRole = currentScreen === 'rutas' || currentScreen === 'billetera';

  return (
    <>
      {fabMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setFabMenuOpen(false)}
          className="absolute inset-0 z-30 bg-slate-900/25 backdrop-blur-[1px]"
        />
      )}

      <nav
        aria-label="Menú rápido de la aplicación"
        className={`absolute ${positionClass} z-40 flex flex-col items-start gap-2.5`}
      >
        {fabMenuOpen && (
          <ul className="flex flex-col items-start gap-2 mb-0.5 pl-1.5">
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  setShowRolesModal(true);
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-slate-700 group-hover:text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Users className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Roles
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
                className="flex items-center gap-2.5 group"
              >
                <span
                  className={`w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-colors ${
                    currentScreen === 'billetera'
                      ? 'text-[#0D9488]'
                      : 'text-slate-700 group-hover:text-[#0D9488]'
                  }`}
                >
                  <Wallet className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Billetera ({formatCOP(balance)})
                  {currentScreen === 'billetera' ? ' (Actual)' : ''}
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  if (currentScreen === 'rutas') {
                    onCurrentRoutesAction?.();
                  } else {
                    onNavigate('rutas');
                  }
                }}
                className="flex items-center gap-2.5 group"
              >
                <span
                  className={`w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-colors ${
                    currentScreen === 'rutas'
                      ? 'text-[#0D9488]'
                      : 'text-slate-700 group-hover:text-[#0D9488]'
                  }`}
                >
                  <Route className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Rutas{currentScreen === 'rutas' ? ' (Actual)' : ''}
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
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-[#0D9488] text-white shadow-lg border-2 border-white flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg">
                  Ticket QR
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
          className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-[0_8px_24px_rgba(13,148,136,0.45)] border-2 border-white active:scale-95 transition-all cursor-pointer ${
            fabMenuOpen ? 'bg-slate-900' : 'bg-[#0D9488] hover:bg-teal-700'
          }`}
        >
          <Plus
            className={`w-7 h-7 transition-transform duration-200 ${
              fabMenuOpen ? 'rotate-45' : ''
            }`}
          />
        </button>
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
                onClick={() => {
                  setShowRolesModal(false);
                  if (!isPassengerRole) onNavigate('rutas');
                }}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                  isPassengerRole
                    ? 'border-2 border-[#0D9488] bg-teal-50/50'
                    : 'border border-slate-200 hover:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      App Pasajero{isPassengerRole ? ' (Actual)' : ''}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Mapa en Vivo, Rutas y Billetera Digital
                    </p>
                  </div>
                </div>
                {isPassengerRole ? (
                  <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRolesModal(false);
                  if (currentScreen !== 'conductor') onNavigate('conductor');
                }}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                  currentScreen === 'conductor'
                    ? 'border-2 border-[#0D9488] bg-teal-50/50'
                    : 'border border-slate-200 hover:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bus className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      App Conductor (Tableta){currentScreen === 'conductor' ? ' (Actual)' : ''}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Navegación, Validador QR y Conteo APC
                    </p>
                  </div>
                </div>
                {currentScreen === 'conductor' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRolesModal(false);
                  if (currentScreen !== 'operador') onNavigate('operador');
                }}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                  currentScreen === 'operador'
                    ? 'border-2 border-[#0D9488] bg-teal-50/50'
                    : 'border border-slate-200 hover:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Centro de Control (Operador Web)
                      {currentScreen === 'operador' ? ' (Actual)' : ''}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Telemetría de Flota, Recaudo e Incidencias
                    </p>
                  </div>
                </div>
                {currentScreen === 'operador' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <PWAInstallButton
                variant="card"
                showFallbackHint
                onAfterAction={() => setShowRolesModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
