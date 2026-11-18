import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Bus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Minus,
  Monitor,
  Navigation,
  Plus,
  QrCode,
  Route,
  Search,
  Store,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  BUS_COMPANIES,
  COMPANY_BUS_ROUTES,
  type CompanyRouteItem,
} from '../data/busRoutesCatalog';
import {
  BARRANQUILLA_PASSENGER_CENTER,
  INITIAL_ROUTE_CARDS,
  TRANSIT_STATIONS,
  USER_GPS_POSITION,
  formatCOP,
  formatDistanceLabel,
  getDistanceMeters,
  getDistanceToPolylineMeters,
} from '../data/barranquillaTransit';
import {useAutocompleteSuggestions} from '../hooks/useAutocompleteSuggestions';
import type {LatLng, RouteFilter, ScreenId, TransitStation} from '../types/transit';
import {
  BarranquillaPassengerMap,
  type MapControlSignal,
  type NearbyBusMarker,
} from './BarranquillaMaps';

const COMPANY_BADGE_CLASSES: Record<string, string> = {
  Coolitoral: 'bg-sky-600',
  Coochofal: 'bg-red-600',
  Sobusa: 'bg-green-600',
  'La Carolina': 'bg-teal-600',
  Sodetrans: 'bg-violet-600',
  Transdiaz: 'bg-blue-600',
  Transurbar: 'bg-orange-600',
  Monterrey: 'bg-emerald-600',
  'Lucero San Felipe': 'bg-amber-600',
  Cootransnorte: 'bg-cyan-600',
  'Flota Ángulo': 'bg-purple-600',
  'Flota Roja': 'bg-rose-700',
  Lolaya: 'bg-green-700',
  Trasalianco: 'bg-blue-700',
  Trasalfa: 'bg-indigo-600',
  Cootrab: 'bg-teal-700',
  Cootransco: 'bg-emerald-700',
  Cootransporcar: 'bg-orange-700',
  Cootrasol: 'bg-sky-700',
  Cooasoatlán: 'bg-violet-700',
  Transmecar: 'bg-amber-700',
  Transoledad: 'bg-rose-600',
  Embusa: 'bg-indigo-700',
  Cootracolsur: 'bg-slate-700',
};

function getCompanyBadgeClass(company: string): string {
  return COMPANY_BADGE_CLASSES[company] ?? 'bg-teal-700';
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function interpolateAlongPath(path: LatLng[], progress: number): LatLng {
  if (path.length === 0) return BARRANQUILLA_PASSENGER_CENTER;
  if (path.length === 1) return path[0];
  const clamped = ((progress % 1) + 1) % 1;
  const scaled = clamped * (path.length - 1);
  const idx = Math.min(path.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const a = path[idx];
  const b = path[idx + 1];
  return {
    lat: a.lat + (b.lat - a.lat) * frac,
    lng: a.lng + (b.lng - a.lng) * frac,
  };
}

interface PlacePoint {
  name: string;
  address: string;
  position: LatLng;
}

interface PassengerMapScreenProps {
  balance: number;
  userPosition: LatLng;
  initialFocusRoute?: CompanyRouteItem | null;
  onClearInitialFocusRoute?: () => void;
  onUpdateUserPosition: (pos: LatLng) => void;
  onNavigate: (screen: ScreenId) => void;
  onReportIncident: (title: string, description: string) => void;
}

const RADIUS_OPTIONS: Array<{label: string; value: number | null}> = [
  {label: '500 m', value: 500},
  {label: '1 km', value: 1000},
  {label: '2 km', value: 2000},
  {label: 'Todas', value: null},
];

export function PassengerMapScreen({
  balance,
  userPosition,
  initialFocusRoute,
  onClearInitialFocusRoute,
  onUpdateUserPosition,
  onNavigate,
  onReportIncident,
}: PassengerMapScreenProps) {
  const placesLib = useMapsLibrary('places');
  const tripCardRef = useRef<HTMLDivElement | null>(null);

  // Origin ("Punto de partida") & Destination ("Destino") state
  const [originQuery, setOriginQuery] = useState('Mi ubicación actual (GPS)');
  const [originMarker, setOriginMarker] = useState<PlacePoint | null>(null);
  const [destQuery, setDestQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<PlacePoint | null>(null);
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);
  const [tripCardCollapsed, setTripCardCollapsed] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Real-time nearby route & bus filters
  const [radiusFilter, setRadiusFilter] = useState<number | null>(1000);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [nearbyFilterText, setNearbyFilterText] = useState<string>('');
  const [onlyToDestination, setOnlyToDestination] = useState<boolean>(false);
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all');
  const [selectedCompanyRoute, setSelectedCompanyRoute] = useState<CompanyRouteItem | null>(
    initialFocusRoute ?? null
  );

  const [showTrafficLayer, setShowTrafficLayer] = useState(false);
  const [showCorridors, setShowCorridors] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportType, setReportType] = useState('Congestión vehicular');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mapSignal, setMapSignal] = useState<MapControlSignal | null>(null);
  const [zoomState, setZoomState] = useState<{zoom: number; isAtDefault: boolean}>({
    zoom: 15,
    isAtDefault: true,
  });

  const autocompleteQuery =
    activeField === 'origin'
      ? originQuery === 'Mi ubicación actual (GPS)'
        ? ''
        : originQuery
      : activeField === 'destination'
      ? destQuery
      : '';

  const {
    suggestions: placeSuggestions,
    isLoading: isSuggestionsLoading,
    error: suggestionsError,
    resetSession,
  } = useAutocompleteSuggestions(autocompleteQuery, activeField !== null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tripCardRef.current && !tripCardRef.current.contains(event.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerSignal = useCallback(
    (type: MapControlSignal['type'], target?: LatLng, zoom?: number) => {
      setMapSignal({type, target, zoom, nonce: Date.now()});
    },
    []
  );

  // Sync incoming route handoff from Rutas screen
  useEffect(() => {
    if (!initialFocusRoute) return;
    setSelectedCompanyRoute(initialFocusRoute);
    setRadiusFilter(null);
    setSheetExpanded(true);
    triggerSignal('focus', initialFocusRoute.center, 14);
    setToastMsg(`Explorando ${initialFocusRoute.company} · ${initialFocusRoute.code}`);
    onClearInitialFocusRoute?.();
  }, [initialFocusRoute, onClearInitialFocusRoute, triggerSignal]);

  // Real-time bus telemetry ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % 60);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  const busT01Position: LatLng = useMemo(() => {
    const offset = Math.sin(tick * 0.28) * 0.00075;
    return {lat: 10.9946 + offset, lng: -74.8072 - offset * 0.45};
  }, [tick]);

  const busA12Position: LatLng = useMemo(() => {
    const offset = Math.cos(tick * 0.25) * 0.0007;
    return {lat: 10.9918 + offset * 0.35, lng: -74.8091 + offset};
  }, [tick]);

  const activeOrigin = originMarker?.position ?? userPosition;

  // Locate user via browser Geolocation API (with safe Barranquilla bounds check)
  const handleLocateUser = useCallback(() => {
    setOriginMarker(null);
    setOriginQuery('Mi ubicación actual (GPS)');
    setActiveField(null);

    if (!navigator.geolocation) {
      onUpdateUserPosition(USER_GPS_POSITION);
      triggerSignal('centerUser', USER_GPS_POSITION, 16);
      setToastMsg('Ubicación fijada en Cra 46 con Calle 74 (Barranquilla)');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const realPos: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const distFromBaq = getDistanceMeters(realPos, BARRANQUILLA_PASSENGER_CENTER);
        if (distFromBaq <= 60000) {
          onUpdateUserPosition(realPos);
          triggerSignal('centerUser', realPos, 16);
          setToastMsg('Tu ubicación GPS en Barranquilla ha sido actualizada');
        } else {
          onUpdateUserPosition(USER_GPS_POSITION);
          triggerSignal('centerUser', USER_GPS_POSITION, 16);
          setToastMsg('GPS ubicado en Barranquilla (Cra 46 con Calle 74) para ver buses locales');
        }
      },
      () => {
        setIsLocatingUser(false);
        onUpdateUserPosition(USER_GPS_POSITION);
        triggerSignal('centerUser', USER_GPS_POSITION, 16);
        setToastMsg('Centrado en tu ubicación de Barranquilla (Cra 46 con Cll 74)');
      },
      {enableHighAccuracy: true, timeout: 6000}
    );
  }, [onUpdateUserPosition, triggerSignal]);

  // Compute live nearby TransMetro buses
  const nearbyTransmetroRoutes = useMemo(() => {
    const q = normalizeText(nearbyFilterText.trim());
    return INITIAL_ROUTE_CARDS.map((r) => {
      const busPos = r.category === 'troncal' ? busT01Position : busA12Position;
      const distanceMeters = getDistanceMeters(activeOrigin, busPos);
      const destMeters = selectedDestination
        ? getDistanceMeters(selectedDestination.position, busPos)
        : null;
      return {
        ...r,
        busPos,
        distanceMeters,
        nearDestination: destMeters !== null ? destMeters <= 2500 : false,
      };
    })
      .filter((r) => {
        if (selectedCompany !== 'all') return false;
        if (radiusFilter !== null && r.distanceMeters > radiusFilter) return false;
        if (onlyToDestination && selectedDestination && !r.nearDestination) return false;
        if (
          q &&
          !normalizeText(r.code).includes(q) &&
          !normalizeText(r.name).includes(q) &&
          !normalizeText(r.corridor).includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [
    activeOrigin,
    busT01Position,
    busA12Position,
    nearbyFilterText,
    selectedCompany,
    radiusFilter,
    onlyToDestination,
    selectedDestination,
  ]);

  // Compute real-time nearby company buses & routes
  const nearbyCompanyRoutes = useMemo(() => {
    const q = normalizeText(nearbyFilterText.trim());
    return COMPANY_BUS_ROUTES.map((route, idx) => {
      const distanceToRoute = getDistanceToPolylineMeters(activeOrigin, route.path);
      const speedSeed = ((tick * 0.045 + idx * 0.17) % 1 + 1) % 1;
      const liveBusPos = interpolateAlongPath(route.path, speedSeed);
      const busDistanceMeters = getDistanceMeters(activeOrigin, liveBusPos);
      const effectiveDist = Math.min(distanceToRoute, busDistanceMeters);
      const destDist = selectedDestination
        ? getDistanceToPolylineMeters(selectedDestination.position, route.path)
        : null;
      const liveEta = Math.max(
        1,
        Math.min(18, Math.round(busDistanceMeters / 240) + (route.etaMinutes % 4))
      );

      return {
        route,
        liveBusPos,
        distanceMeters: effectiveDist,
        busDistanceMeters,
        liveEta,
        servesDestination: destDist !== null ? destDist <= 1600 : false,
      };
    })
      .filter((item) => {
        if (selectedCompany !== 'all' && item.route.company !== selectedCompany) return false;
        if (radiusFilter !== null && item.distanceMeters > radiusFilter) return false;
        if (onlyToDestination && selectedDestination && !item.servesDestination) return false;
        if (
          q &&
          !normalizeText(item.route.company).includes(q) &&
          !normalizeText(item.route.code).includes(q) &&
          !normalizeText(item.route.description).includes(q) &&
          !normalizeText(item.route.corridor).includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [
    activeOrigin,
    tick,
    nearbyFilterText,
    selectedCompany,
    radiusFilter,
    onlyToDestination,
    selectedDestination,
  ]);

  const nearbyBusMarkers: NearbyBusMarker[] = useMemo(() => {
    return nearbyCompanyRoutes.slice(0, 8).map((item) => ({
      id: `bus-${item.route.id}`,
      code: item.route.code,
      company: item.route.company,
      position: item.liveBusPos,
      etaMinutes: item.liveEta,
      distanceMeters: item.busDistanceMeters,
      color: item.route.color,
    }));
  }, [nearbyCompanyRoutes]);

  const matchingStations = useMemo(() => {
    const q = normalizeText(autocompleteQuery.trim());
    if (q.length < 2) return [];
    return TRANSIT_STATIONS.filter(
      (st) => normalizeText(st.name).includes(q) || normalizeText(st.subtitle).includes(q)
    );
  }, [autocompleteQuery]);

  const applyPlacePoint = useCallback(
    (point: PlacePoint, targetField: 'origin' | 'destination') => {
      if (targetField === 'origin') {
        setOriginMarker(point);
        setOriginQuery(point.name);
        triggerSignal('focus', point.position, 15);
        setToastMsg(`Punto de partida: ${point.name}`);
      } else {
        setSelectedDestination(point);
        setDestQuery(point.name);
        triggerSignal('focus', point.position, 15);
        setToastMsg(`Destino: ${point.name}`);
      }
      setActiveField(null);
      resetSession();
    },
    [resetSession, triggerSignal]
  );

  const handleSelectPlaceSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction || !activeField) return;
    const targetField = activeField;
    setIsResolvingPlace(true);
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const loc = place.location;
      if (loc) {
        const position = {lat: loc.lat(), lng: loc.lng()};
        const name =
          place.displayName ??
          suggestion.placePrediction.mainText?.text ??
          suggestion.placePrediction.text.text;
        const address =
          place.formattedAddress ??
          suggestion.placePrediction.secondaryText?.text ??
          'Barranquilla, Atlántico';
        applyPlacePoint({name, address, position}, targetField);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setToastMsg('No se pudo obtener la ubicación de ese lugar');
    } finally {
      setIsResolvingPlace(false);
    }
  };

  const handleSwapOriginDestination = () => {
    const prevOriginPoint: PlacePoint = originMarker ?? {
      name: 'Mi ubicación actual (GPS)',
      address: 'Cra 46 con Calle 74 · Barranquilla',
      position: userPosition,
    };
    const prevDestPoint = selectedDestination;

    if (prevDestPoint) {
      setOriginMarker(prevDestPoint);
      setOriginQuery(prevDestPoint.name);
    } else {
      setOriginMarker(null);
      setOriginQuery('Mi ubicación actual (GPS)');
    }

    setSelectedDestination(prevOriginPoint);
    setDestQuery(prevOriginPoint.name);
    setToastMsg('Punto de partida y destino intercambiados');
  };

  const handleCameraSync = useCallback((zoom: number, isAtDefault: boolean) => {
    setZoomState({zoom, isAtDefault});
  }, []);

  const handleToggleLayers = () => {
    setShowTrafficLayer((prev) => {
      const next = !prev;
      setToastMsg(
        next
          ? 'Capa de tráfico en vivo activada en Barranquilla'
          : 'Capa de corredores troncales actualizada'
      );
      return next;
    });
    setShowCorridors(true);
  };

  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const detail =
      reportText.trim() || 'Demora reportada por pasajero cerca de Estación La Catorce.';
    onReportIncident(`${reportType} • Cra 46`, detail);
    setReportText('');
    setShowReportModal(false);
    setToastMsg('Incidente enviado al Centro de Control BAQ');
  };

  const totalNearbyCount = nearbyTransmetroRoutes.length + nearbyCompanyRoutes.length;

  return (
    <div className="@container relative w-full h-full max-w-[960px] mx-auto bg-white flex flex-col overflow-hidden border-x border-slate-200">
      {/* Top Floating Trip Planner: Punto de partida + Destino */}
      <header className="absolute top-0 left-0 right-0 z-30 px-3 pt-2.5 pb-2 bg-gradient-to-b from-slate-900/55 via-slate-900/15 to-transparent pointer-events-none">
        <div ref={tripCardRef} className="relative pointer-events-auto">
          {tripCardCollapsed ? (
            <button
              type="button"
              onClick={() => setTripCardCollapsed(false)}
              className="w-full px-3.5 py-2.5 rounded-[12px] bg-white shadow-xl border border-slate-200 flex items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Compass className="w-4 h-4 text-[#0D9488] shrink-0" />
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {originMarker ? originMarker.name : 'Tu ubicación'} →{' '}
                  {selectedDestination ? selectedDestination.name : 'Elegir destino'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
          ) : (
            <div className="bg-white rounded-[14px] shadow-xl border border-slate-200 p-2 space-y-1.5">
              {/* Row 1: Punto de partida */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 flex items-center">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200 absolute left-3 pointer-events-none"
                  />
                  <input
                    type="text"
                    aria-label="Punto de partida"
                    value={originQuery}
                    onFocus={() => {
                      setActiveField('origin');
                      if (originQuery === 'Mi ubicación actual (GPS)') {
                        setOriginQuery('');
                      }
                    }}
                    onChange={(e) => {
                      setOriginQuery(e.target.value);
                      setActiveField('origin');
                      if (!e.target.value.trim()) {
                        setOriginMarker(null);
                      }
                    }}
                    placeholder="Punto de partida (ej. Cra 46, Prado...)"
                    className="w-full h-9 pl-8 pr-16 py-0 leading-normal rounded-[9px] bg-slate-100 text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
                  />
                  <div className="absolute right-1.5 flex items-center gap-0.5">
                    {originQuery && originQuery !== 'Mi ubicación actual (GPS)' && (
                      <button
                        type="button"
                        onClick={() => {
                          setOriginMarker(null);
                          setOriginQuery('Mi ubicación actual (GPS)');
                        }}
                        aria-label="Restablecer punto de partida a GPS"
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLocateUser}
                      title="Usar mi ubicación GPS actual"
                      aria-label="Usar mi ubicación GPS actual"
                      className="w-7 h-7 rounded-md bg-white border border-slate-200 text-[#0D9488] hover:bg-teal-50 flex items-center justify-center shadow-xs"
                    >
                      {isLocatingUser ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LocateFixed className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSwapOriginDestination}
                  aria-label="Intercambiar partida y destino"
                  title="Intercambiar partida y destino"
                  className="w-9 h-9 rounded-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 2: Destino */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 flex items-center">
                  <MapPin
                    aria-hidden="true"
                    className="w-3.5 h-3.5 text-[#0D9488] absolute left-2.5 pointer-events-none"
                  />
                  <input
                    type="text"
                    aria-label="Destino"
                    value={destQuery}
                    onFocus={() => setActiveField('destination')}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setActiveField('destination');
                      if (!e.target.value.trim()) {
                        setSelectedDestination(null);
                        setOnlyToDestination(false);
                      }
                    }}
                    placeholder="¿Cuál es tu destino en Barranquilla?"
                    className="w-full h-9 pl-8 pr-8 py-0 leading-normal rounded-[9px] bg-slate-100 text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
                  />
                  {destQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestQuery('');
                        setSelectedDestination(null);
                        setOnlyToDestination(false);
                      }}
                      aria-label="Limpiar destino"
                      className="p-1 absolute right-1.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setTripCardCollapsed(true)}
                  aria-label="Minimizar barra de ruta"
                  title="Minimizar para ver más mapa"
                  className="w-9 h-9 rounded-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Shared Places Autocomplete Dropdown for Origin or Destination */}
          {activeField && autocompleteQuery.trim().length >= 2 && (
            <div
              role="listbox"
              aria-label="Sugerencias de lugares"
              className="absolute left-0 right-0 mt-1.5 bg-white rounded-[12px] shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-60 overflow-y-auto divide-y divide-slate-100"
            >
              {activeField === 'origin' && (
                <button
                  type="button"
                  onClick={handleLocateUser}
                  className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 bg-teal-50/60 hover:bg-teal-100/70 transition-colors"
                >
                  <LocateFixed className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span className="text-xs font-semibold text-[#0D9488]">
                    Usar mi ubicación actual (GPS)
                  </span>
                </button>
              )}

              {matchingStations.map((st) => (
                <button
                  key={`st-${st.id}`}
                  type="button"
                  onClick={() =>
                    applyPlacePoint(
                      {name: st.name, address: st.subtitle, position: st.position},
                      activeField
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-teal-50/70 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{st.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Estación TransMetro · {st.subtitle}
                    </p>
                  </div>
                </button>
              ))}

              {(isSuggestionsLoading || isResolvingPlace) && (
                <div className="px-3.5 py-3 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                  <span>Buscando en Barranquilla...</span>
                </div>
              )}

              {!isSuggestionsLoading &&
                placeSuggestions.map((suggestion, idx) => {
                  const pred = suggestion.placePrediction;
                  if (!pred) return null;
                  const main = pred.mainText?.text ?? pred.text.text;
                  const secondary = pred.secondaryText?.text ?? '';
                  return (
                    <button
                      key={pred.placeId ?? `place-${idx}`}
                      type="button"
                      onClick={() => void handleSelectPlaceSuggestion(suggestion)}
                      className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{main}</p>
                        {secondary && (
                          <p className="text-[11px] text-slate-500 truncate">{secondary}</p>
                        )}
                      </div>
                    </button>
                  );
                })}

              {!isSuggestionsLoading && suggestionsError && matchingStations.length === 0 && (
                <div className="px-3.5 py-3 text-xs text-amber-700 bg-amber-50">
                  {suggestionsError}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Interactive Real Barranquilla Explore Map */}
      <main className="relative flex-1 min-h-[220px] w-full bg-[#E8ECEF] overflow-hidden">
        <BarranquillaPassengerMap
          routeFilter={routeFilter}
          showTrafficLayer={showTrafficLayer}
          showCorridors={showCorridors}
          busT01Position={busT01Position}
          busA12Position={busA12Position}
          userPosition={userPosition}
          originMarker={originMarker}
          selectedDestination={selectedDestination}
          selectedCompanyRoute={selectedCompanyRoute}
          userRadiusMeters={radiusFilter}
          nearbyBuses={nearbyBusMarkers}
          signal={mapSignal}
          onCameraSync={handleCameraSync}
          onSelectStation={(st) => setSelectedStation(st)}
          onSelectBus={(code) => {
            if (code === 'T-01') {
              triggerSignal('focus', busT01Position, 16);
              setToastMsg('Bus #B-304 (T-01) • Llega en 2 min • 42% Ocupación');
            } else {
              triggerSignal('focus', busA12Position, 16);
              setToastMsg('Bus #B-118 (A-12) • Llega en 6 min • 18% Ocupación');
            }
          }}
          onSelectNearbyBus={(bus) => {
            const found = COMPANY_BUS_ROUTES.find((r) => `bus-${r.id}` === bus.id);
            if (found) setSelectedCompanyRoute(found);
            triggerSignal('focus', bus.position, 15);
            setToastMsg(
              `${bus.company} (${bus.code}) • a ${formatDistanceLabel(bus.distanceMeters)} • ${bus.etaMinutes} min`
            );
          }}
        />

        {/* Floating Map Utility Buttons */}
        <aside
          aria-label="Controles del mapa"
          className={`absolute right-3 z-20 flex flex-col gap-1.5 transition-all ${
            tripCardCollapsed ? 'top-[62px]' : 'top-[108px]'
          }`}
        >
          <button
            type="button"
            onClick={handleLocateUser}
            aria-label="Ubicar mi posición GPS"
            className="w-10 h-10 rounded-full bg-white text-slate-900 shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
          >
            {isLocatingUser ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
            ) : (
              <LocateFixed className="w-4 h-4 text-[#0D9488]" />
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleLayers}
            aria-label="Capas de tráfico"
            className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center active:scale-95 transition-all ${
              showTrafficLayer
                ? 'bg-slate-900 text-teal-400 border-slate-700'
                : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            aria-label="Reportar incidente"
            className="w-10 h-10 rounded-full bg-white text-slate-900 shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          </button>

          <div
            role="group"
            aria-label="Zoom del mapa"
            className="w-10 rounded-full bg-white text-slate-900 shadow-lg border border-slate-200 flex flex-col overflow-hidden"
          >
            <button
              type="button"
              aria-label="Acercar"
              disabled={zoomState.zoom >= 19}
              onClick={() => triggerSignal('zoomIn')}
              className="w-10 h-8 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-35"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Alejar"
              disabled={zoomState.zoom <= 11}
              onClick={() => triggerSignal('zoomOut')}
              className="w-10 h-8 flex items-center justify-center border-t border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-35"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Restablecer vista"
              disabled={zoomState.isAtDefault}
              onClick={() => triggerSignal('reset')}
              className="w-10 h-8 flex items-center justify-center border-t border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-35"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      </main>

      {/* Bottom Sliding Sheet: Nearby Live Buses & Real-Time Routes */}
      <section
        aria-label="Buses y rutas cercanas en tiempo real"
        className={`relative z-30 shrink-0 min-h-0 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-slate-200 px-3.5 pt-2 pb-4 flex flex-col gap-2 transition-all ${
          sheetExpanded ? 'max-h-[68%]' : 'max-h-[42%]'
        }`}
      >
        <button
          type="button"
          onClick={() => setSheetExpanded((s) => !s)}
          aria-label="Expandir o contraer buses cercanos"
          className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto hover:bg-slate-400 transition-colors"
        />

        {/* Header Row: Live Nearby Summary */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>En tiempo real · {totalNearbyCount} cerca</span>
            </span>
            <h2 className="font-headline text-sm @[420px]:text-base font-bold text-slate-900 truncate flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
              <span className="truncate">
                {originMarker ? originMarker.name : 'Alrededor de tu ubicación'}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('rutas')}
            className="min-h-[34px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold flex items-center gap-1 shrink-0"
          >
            <Route className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Ver Rutas</span>
          </button>
        </div>

        {/* Real-time Radius & Destination Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 pb-0.5">
          {RADIUS_OPTIONS.map((opt) => {
            const active = radiusFilter === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setRadiusFilter(opt.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#0D9488] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.value === null ? opt.label : `Radio ${opt.label}`}
              </button>
            );
          })}

          {selectedDestination && (
            <button
              type="button"
              onClick={() => setOnlyToDestination((v) => !v)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                onlyToDestination
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
              }`}
            >
              Hacia destino ✓
            </button>
          )}
        </div>

        {/* Company & Quick Nearby Text Filter */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-12 gap-2 shrink-0">
          <div className="@[480px]:col-span-5">
            <select
              aria-label="Filtrar buses cercanos por empresa"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full h-9 px-2.5 py-0 rounded-[10px] bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="all">Todas las empresas ({BUS_COMPANIES.length})</option>
              {BUS_COMPANIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="@[480px]:col-span-7 relative flex items-center">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none"
            />
            <input
              type="text"
              aria-label="Filtrar rutas cercanas"
              value={nearbyFilterText}
              onFocus={() => setSheetExpanded(true)}
              onChange={(e) => setNearbyFilterText(e.target.value)}
              placeholder="Filtrar buses o rutas cercanas..."
              className="w-full h-9 pl-8 pr-8 py-0 leading-normal rounded-[10px] bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
            />
            {nearbyFilterText && (
              <button
                type="button"
                onClick={() => setNearbyFilterText('')}
                aria-label="Limpiar filtro"
                className="p-1 absolute right-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Nearby Buses & Routes Cards */}
        <div className="flex-1 min-h-0 grid grid-cols-1 @[560px]:grid-cols-2 gap-2.5 overflow-y-auto pr-0.5 content-start">
          {totalNearbyCount === 0 ? (
            <div className="col-span-full py-5 text-center text-xs text-slate-500 space-y-2">
              <p>No hay buses dentro de este radio con los filtros aplicados.</p>
              <button
                type="button"
                onClick={() => {
                  setRadiusFilter(null);
                  setSelectedCompany('all');
                  setNearbyFilterText('');
                  setOnlyToDestination(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
              >
                Ampliar radio a toda la ciudad
              </button>
            </div>
          ) : (
            <>
              {nearbyTransmetroRoutes.map((route) => {
                const isTroncal = route.category === 'troncal';
                const badgeColor = isTroncal ? 'bg-[#2563EB]' : 'bg-[#16A34A]';
                return (
                  <article
                    key={route.id}
                    onClick={() => {
                      triggerSignal('focus', route.busPos, 16);
                      setToastMsg(`Siguiendo ${route.code} (${route.busId}) en tiempo real`);
                    }}
                    className="p-3 rounded-[14px] bg-slate-50 border border-slate-200 hover:border-[#0D9488] transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2 py-1 ${badgeColor} text-white font-headline text-sm font-bold rounded-[6px] shrink-0`}
                        >
                          {route.code}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate">
                            {route.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate">
                            {route.busId} · a {formatDistanceLabel(route.distanceMeters)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-headline text-sm text-emerald-700 font-bold tabular-nums">
                          {route.etaMinutes} min
                        </span>
                        <p className="text-[10px] text-slate-500 tabular-nums">En vivo</p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-medium text-slate-600">
                        {route.occupancyPct}% Ocupación
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {formatCOP(route.fareCop)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('billetera');
                          }}
                          className="min-h-7 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800"
                        >
                          QR Pasaje
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {nearbyCompanyRoutes.map((item) => {
                const {route, distanceMeters, liveEta, servesDestination, liveBusPos} = item;
                const isSelected = selectedCompanyRoute?.id === route.id;
                return (
                  <article
                    key={route.id}
                    onClick={() => {
                      setSelectedCompanyRoute(route);
                      triggerSignal('focus', liveBusPos, 15);
                      setToastMsg(`${route.company} · ${route.code} a ${formatDistanceLabel(distanceMeters)}`);
                    }}
                    className={`p-3 rounded-[14px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/70 border-[#0D9488] ring-1 ring-[#0D9488]'
                        : 'bg-slate-50 border-slate-200 hover:border-[#0D9488]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`px-2 py-1 ${getCompanyBadgeClass(
                            route.company
                          )} text-white font-headline text-xs font-bold rounded-[6px] shrink-0 mt-0.5`}
                        >
                          {route.code}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-xs font-bold text-slate-900 leading-snug">
                              {route.company}
                            </h3>
                            <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-mono text-[10px] font-bold">
                              a {formatDistanceLabel(distanceMeters)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-snug mt-0.5 truncate">
                            {route.description}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                            {route.corridor}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-headline text-sm text-emerald-700 font-bold tabular-nums">
                          {liveEta} min
                        </span>
                        <p className="text-[10px] text-slate-500 tabular-nums">En camino</p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 truncate">
                        <Bus className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {servesDestination
                            ? 'Conecta cerca a tu destino'
                            : isSelected
                            ? 'Siguiendo en mapa'
                            : 'Ver bus en mapa'}
                        </span>
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {formatCOP(route.fareCop)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('billetera');
                          }}
                          className="min-h-7 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800"
                        >
                          QR Pasaje
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* X-style Single Floating Action Button & Expandable Navigation Menu */}
      {fabMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setFabMenuOpen(false)}
          className="absolute inset-0 z-30 bg-slate-900/25 backdrop-blur-[1px]"
        />
      )}

      <nav
        aria-label="Menú rápido de la aplicación"
        className="absolute bottom-4 left-4 z-40 flex flex-col items-start gap-2.5"
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
                  onNavigate('billetera');
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-slate-700 group-hover:text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Wallet className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Billetera ({formatCOP(balance)})
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  onNavigate('rutas');
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-slate-700 group-hover:text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Route className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Rutas
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  setSheetExpanded(false);
                  triggerSignal('centerUser', userPosition, 15);
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Compass className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Explorar mapa (Actual)
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  onNavigate('billetera');
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

      {/* Station Details / Schedule Modal */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-slate-900">
                    {selectedStation.name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedStation.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-900">Próximos arribos garantizados:</p>
              {selectedStation.arrivals.map((arr) => (
                <div
                  key={arr.route}
                  className="p-2.5 rounded bg-slate-50 flex items-center justify-between"
                >
                  <span
                    className={`font-bold ${
                      arr.category === 'troncal'
                        ? 'text-[#2563EB]'
                        : arr.category === 'alimentador'
                        ? 'text-[#16A34A]'
                        : 'text-[#DC2626]'
                    }`}
                  >
                    {arr.label}
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">
                    {arr.minutes} min ({arr.busId})
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedStation(null);
                  onNavigate('billetera');
                }}
                className="w-full min-h-[48px] rounded-[10px] bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Generar Pasaje para Abordar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Switcher Modal */}
      {showRolesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
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

      {/* Notifications Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-headline text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0D9488]" />
                Alertas del Servicio BAQ
              </h3>
              <button
                type="button"
                onClick={() => setShowNotifModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="font-bold text-amber-900">Desvío temporal Vía 40</p>
                <p className="text-amber-800 mt-0.5">
                  Rutas A-04 y T-01 presentan demora de 6 a 9 min en retorno C76.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
                <p className="font-bold text-teal-900">Transbordo gratuito habilitado</p>
                <p className="text-teal-800 mt-0.5">
                  Tienes ventana de 45 min para conectar con alimentadores en Est. La Catorce.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <form
            onSubmit={handleSubmitIncident}
            className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-headline text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                Reportar Novedad en Ruta
              </h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="font-medium text-slate-700">Tipo de novedad</span>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
                >
                  <option>Congestión vehicular</option>
                  <option>Bus lleno en parada</option>
                  <option>Daño en estación</option>
                </select>
              </label>
              <label className="block">
                <span className="font-medium text-slate-700">Detalles (opcional)</span>
                <textarea
                  rows={2}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Ej. Trancón en Cra 46 con Calle 72..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
                />
              </label>
            </div>
            <button
              type="submit"
              className="w-full min-h-[46px] rounded-[10px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Enviar Reporte al Operador
            </button>
          </form>
        </div>
      )}

      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 max-w-[90%] whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
