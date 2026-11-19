import React, {useCallback, useEffect, useState} from 'react';
import {APIProvider} from '@vis.gl/react-google-maps';
import {DriverCockpitScreen} from './components/DriverCockpitScreen';
import {OperatorDashboardScreen} from './components/OperatorDashboardScreen';
import {PassengerMapScreen} from './components/PassengerMapScreen';
import {PassengerRoutesScreen} from './components/PassengerRoutesScreen';
import {PassengerWalletScreen} from './components/PassengerWalletScreen';
import {
  INITIAL_INCIDENTS,
  INITIAL_TRANSACTIONS,
  NATIVE_DEVICE_BY_SCREEN,
  USER_GPS_POSITION,
} from './data/barranquillaTransit';
import type {CompanyRouteItem} from './data/busRoutesCatalog';
import type {
  DeviceMode,
  LatLng,
  OperationalIncident,
  ScreenId,
  WalletTransaction,
} from './types/transit';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

function getInitialScreen(): ScreenId {
  const raw = window.location.hash.replace('#', '') as ScreenId;
  if (
    raw === 'mapa' ||
    raw === 'rutas' ||
    raw === 'billetera' ||
    raw === 'conductor' ||
    raw === 'operador'
  ) {
    return raw;
  }
  return 'mapa';
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>(getInitialScreen);
  const [device, setDevice] = useState<DeviceMode>(() => NATIVE_DEVICE_BY_SCREEN[getInitialScreen()]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Shared cross-screen transit state
  const [balance, setBalance] = useState(18600);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);
  const [extraPax, setExtraPax] = useState(0);
  const [incidents, setIncidents] = useState<OperationalIncident[]>(INITIAL_INCIDENTS);
  const [incomingBroadcast, setIncomingBroadcast] = useState<{text: string; nonce: number} | null>(
    null
  );
  const [userPosition, setUserPosition] = useState<LatLng>(USER_GPS_POSITION);
  const [exploreRoute, setExploreRoute] = useState<CompanyRouteItem | null>(null);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = getInitialScreen();
      setScreen(next);
      setDevice(NATIVE_DEVICE_BY_SCREEN[next]);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!globalToast) return;
    const t = window.setTimeout(() => setGlobalToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [globalToast]);

  const navigateTo = useCallback((next: ScreenId) => {
    setScreen(next);
    setDevice(NATIVE_DEVICE_BY_SCREEN[next]);
    if (window.location.hash !== `#${next}`) {
      window.location.hash = next;
    }
  }, []);

  const handleTopUp = useCallback((amount: number, methodLabel: string) => {
    setBalance((prev) => prev + amount);
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: 'topup',
        title: methodLabel,
        subtitle: 'Ahora mismo • Aprobado',
        amountCop: amount,
      },
      ...prev,
    ]);
  }, []);

  const handleSimulateBoarding = useCallback(() => {
    setExtraPax((p) => p + 1);
    setGlobalToast('Pasaje validado: el Centro de Control sumó +1 pasajero');
  }, []);

  const handlePanicAlert = useCallback(() => {
    setIncidents((prev) => [
      {
        id: `inc-panic-${Date.now()}`,
        severity: 'critical',
        title: 'ALERTA PÁNICO • Bus #B-304 (T-01)',
        timeAgo: 'Ahora mismo',
        description:
          'Botón de emergencia activado por conductor Carlos E. Mendoza en Cra 46 con Calle 72. Despacho policial notificado.',
      },
      ...prev,
    ]);
    setGlobalToast('Alerta de pánico del bus #B-304 recibida en el Operador');
  }, []);

  const handlePassengerReport = useCallback((title: string, description: string) => {
    setIncidents((prev) => [
      {
        id: `inc-pax-${Date.now()}`,
        severity: 'warning',
        title,
        timeAgo: 'Ahora mismo',
        description,
      },
      ...prev,
    ]);
    setGlobalToast('Reporte de pasajero recibido en el Centro de Control');
  }, []);

  const handleBroadcast = useCallback((text: string) => {
    setIncomingBroadcast({text, nonce: Date.now()});
    setGlobalToast('Comunicado enviado a las consolas de conductores');
  }, []);

  const frameSizeClass =
    device === 'movil'
      ? 'w-full h-full sm:h-[min(844px,100%)] sm:min-h-[540px] sm:max-w-[390px] sm:my-auto sm:rounded-[20px]'
      : device === 'tablet'
      ? 'w-full h-full sm:h-[min(768px,100%)] sm:min-h-[540px] sm:max-w-[1024px] sm:my-auto sm:rounded-[20px]'
      : 'w-full h-full sm:min-h-[540px] sm:rounded-[12px]';

  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      libraries={['marker', 'maps', 'places']}
      language="es"
      region="CO"
    >
      <div className="h-full w-full flex flex-col bg-[#E8ECEF] overflow-hidden">
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* App Device Stage */}
        <main className="flex-1 min-h-0 flex justify-center p-0 sm:p-3 overflow-y-auto">
          <div
            className={`${frameSizeClass} overflow-hidden shadow-[0_10px_40px_rgba(15,23,42,0.25)] bg-white transition-all duration-200 shrink-0`}
          >
            {screen === 'mapa' && (
              <PassengerMapScreen
                balance={balance}
                userPosition={userPosition}
                initialFocusRoute={exploreRoute}
                onClearInitialFocusRoute={() => setExploreRoute(null)}
                onUpdateUserPosition={setUserPosition}
                onNavigate={navigateTo}
                onReportIncident={handlePassengerReport}
              />
            )}
            {screen === 'rutas' && (
              <PassengerRoutesScreen
                balance={balance}
                onNavigate={navigateTo}
                onExploreRoute={(route) => {
                  setExploreRoute(route);
                  navigateTo('mapa');
                }}
              />
            )}
            {screen === 'billetera' && (
              <PassengerWalletScreen
                balance={balance}
                transactions={transactions}
                onTopUp={handleTopUp}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'conductor' && (
              <DriverCockpitScreen
                balance={balance}
                extraPax={extraPax}
                incomingBroadcast={incomingBroadcast}
                onSimulateBoarding={handleSimulateBoarding}
                onPanicAlert={handlePanicAlert}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'operador' && (
              <OperatorDashboardScreen
                balance={balance}
                extraPax={extraPax}
                incidents={incidents}
                onBroadcast={handleBroadcast}
                onNavigate={navigateTo}
              />
            )}
          </div>
        </main>

        {/* Cross-Screen Prototype Toast */}
        <div
          role="status"
          className={`fixed left-1/2 bottom-5 -translate-x-1/2 z-50 bg-[#0F172A] text-[#F8FAFC] px-4 py-2.5 rounded-xl text-[13px] border border-[#334155] shadow-xl max-w-[90vw] transition-all duration-200 ${
            globalToast
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-5 pointer-events-none'
          }`}
        >
          {globalToast}
        </div>
      </div>
    </APIProvider>
  );
}
