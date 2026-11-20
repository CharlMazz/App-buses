import React, {useCallback, useEffect, useState} from 'react';
import {APIProvider} from '@vis.gl/react-google-maps';
import {DriverCockpitScreen} from './components/DriverCockpitScreen';
import {OfflineIndicator} from './components/OfflineIndicator';
import {OperatorDashboardScreen} from './components/OperatorDashboardScreen';
import {PassengerQrScreen} from './components/PassengerQrScreen';
import {PassengerRoutesScreen} from './components/PassengerRoutesScreen';
import {PassengerWalletScreen} from './components/PassengerWalletScreen';
import {
  INITIAL_INCIDENTS,
  INITIAL_TRANSACTIONS,
  USER_GPS_POSITION,
} from './data/barranquillaTransit';
import type {
  LatLng,
  OperationalIncident,
  PlacePoint,
  ScreenId,
  TripPlannerState,
  WalletTransaction,
} from './types/transit';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

function getInitialScreen(): ScreenId {
  const raw = window.location.hash.replace('#', '');
  if (
    raw === 'rutas' ||
    raw === 'billetera' ||
    raw === 'qr' ||
    raw === 'conductor' ||
    raw === 'operador'
  ) {
    return raw;
  }
  return 'rutas';
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>(getInitialScreen);
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
  const [originQuery, setOriginQuery] = useState('Mi ubicación actual (GPS)');
  const [originMarker, setOriginMarker] = useState<PlacePoint | null>(null);
  const [destQuery, setDestQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<PlacePoint | null>(null);
  const [pendingMapFocus, setPendingMapFocus] = useState<{
    position: LatLng;
    zoom: number;
    nonce: number;
  } | null>(null);
  const [tripSubmittedNonce, setTripSubmittedNonce] = useState(0);
  const [mapPickTarget, setMapPickTarget] = useState<'origin' | 'destination' | null>(null);
  const [reopenTripNonce, setReopenTripNonce] = useState(0);
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

  const handleBroadcast = useCallback((text: string) => {
    setIncomingBroadcast({text, nonce: Date.now()});
    setGlobalToast('Comunicado enviado a las consolas de conductores');
  }, []);

  const handleFocusMap = useCallback((position: LatLng, zoom: number = 15) => {
    setPendingMapFocus({position, zoom, nonce: Date.now()});
  }, []);

  const handleTripSubmitted = useCallback(() => {
    setTripSubmittedNonce((n) => n + 1);
  }, []);

  const handleReopenTripCard = useCallback(() => {
    setReopenTripNonce((n) => n + 1);
  }, []);

  const tripPlanner: TripPlannerState = {
    originQuery,
    originMarker,
    destQuery,
    selectedDestination,
    userPosition,
    tripSubmittedNonce,
    mapPickTarget,
    reopenTripNonce,
    setOriginQuery,
    setOriginMarker,
    setDestQuery,
    setSelectedDestination,
    setMapPickTarget,
    onReopenTripCard: handleReopenTripCard,
    onUpdateUserPosition: setUserPosition,
    onFocusMap: handleFocusMap,
    onTripSubmitted: handleTripSubmitted,
    onToast: setGlobalToast,
  };

  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      libraries={['marker', 'maps', 'places', 'geocoding']}
      language="es"
      region="CO"
    >
      <div className="h-full w-full flex flex-col bg-[#E8ECEF] overflow-hidden">
        <OfflineIndicator />
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

        {/* Responsive Full-Viewport App Stage */}
        <main className="flex-1 min-h-0 flex justify-center overflow-hidden">
          <div className="w-full h-full overflow-hidden bg-white">
            {screen === 'rutas' && (
              <PassengerRoutesScreen
                balance={balance}
                userPosition={userPosition}
                tripPlanner={tripPlanner}
                pendingMapFocus={pendingMapFocus}
                onClearPendingMapFocus={() => setPendingMapFocus(null)}
                onUpdateUserPosition={setUserPosition}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'billetera' && (
              <PassengerWalletScreen
                balance={balance}
                transactions={transactions}
                tripPlanner={tripPlanner}
                onTopUp={handleTopUp}
                onNavigate={navigateTo}
              />
            )}
            {screen === 'qr' && (
              <PassengerQrScreen
                balance={balance}
                tripPlanner={tripPlanner}
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
