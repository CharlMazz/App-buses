import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  QrCode,
  Route,
  Search,
  SlidersHorizontal,
  Store,
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
  USER_GPS_POSITION,
  formatCOP,
  formatDistanceLabel,
  getDistanceMeters,
  getDistanceToPolylineMeters,
  routeIntersectsBounds,
} from '../data/barranquillaTransit';
import type {
  LatLng,
  MapBounds,
  RouteFilter,
  ScreenId,
  TransitStation,
  TripPlannerState,
} from '../types/transit';
import {
  BarranquillaPassengerMap,
  type MapControlSignal,
  type NearbyBusMarker,
} from './BarranquillaMaps';
import {PassengerBottomNav} from './PassengerBottomNav';

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

const RADIUS_OPTIONS: Array<{label: string; value: number | null}> = [
  {label: '500 m', value: 500},
  {label: '1 km', value: 1000},
  {label: '2 km', value: 2000},
  {label: 'Todas', value: null},
];

interface PassengerRoutesScreenProps {
  balance: number;
  userPosition: LatLng;
  tripPlanner: TripPlannerState;
  pendingMapFocus?: {position: LatLng; zoom: number; nonce: number} | null;
  onClearPendingMapFocus?: () => void;
  onUpdateUserPosition: (pos: LatLng) => void;
  onNavigate: (screen: ScreenId) => void;
  onReportIncident: (title: string, description: string) => void;
}

export function PassengerRoutesScreen({
  balance,
  userPosition,
  tripPlanner,
  pendingMapFocus,
  onClearPendingMapFocus,
  onUpdateUserPosition,
  onNavigate,
  onReportIncident,
}: PassengerRoutesScreenProps) {
  const {
    originMarker,
    selectedDestination,
    setOriginMarker,
    setOriginQuery,
    setSelectedDestination,
    setDestQuery,
  } = tripPlanner;

  // Catalog filter state (from Rutas)
  const [searchText, setSearchText] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [filterByMapBounds, setFilterByMapBounds] = useState(true);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<CompanyRouteItem | null>(null);

  // Live nearby bus state (from Explorar)
  const [radiusFilter, setRadiusFilter] = useState<number | null>(1000);
  const [onlyToDestination, setOnlyToDestination] = useState(false);
  const [routeFilter] = useState<RouteFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showTrafficLayer, setShowTrafficLayer] = useState(false);
  const [showCorridors, setShowCorridors] = useState(true);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Unified hidden-by-default drawer & modals
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'nearby' | 'filtered'>('nearby');
  const [searchOpenNonce, setSearchOpenNonce] = useState(0);
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportType, setReportType] = useState('Congestión vehicular');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [mapSignal, setMapSignal] = useState<MapControlSignal | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const triggerSignal = useCallback(
    (type: MapControlSignal['type'], target?: LatLng, zoom?: number) => {
      setMapSignal({type, target, zoom, nonce: Date.now()});
    },
    []
  );

  useEffect(() => {
    if (!pendingMapFocus) return;
    triggerSignal('focus', pendingMapFocus.position, pendingMapFocus.zoom);
    onClearPendingMapFocus?.();
  }, [pendingMapFocus, onClearPendingMapFocus, triggerSignal]);

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

  const handleBoundsChanged = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleLocateUser = useCallback(() => {
    setOriginMarker(null);
    setOriginQuery('Mi ubicación actual (GPS)');

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
  }, [onUpdateUserPosition, setOriginMarker, setOriginQuery, triggerSignal]);

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

  // Filtered routes catalog (only shown when user applies a filter)
  const baseMatches = useMemo(() => {
    const q = normalizeText(searchText.trim());
    return COMPANY_BUS_ROUTES.filter((r) => {
      const matchesCompany = selectedCompany === 'all' || r.company === selectedCompany;
      const matchesQuery =
        !q ||
        normalizeText(r.code).includes(q) ||
        normalizeText(r.company).includes(q) ||
        normalizeText(r.description).includes(q) ||
        normalizeText(r.corridor).includes(q);
      return matchesCompany && matchesQuery;
    });
  }, [searchText, selectedCompany]);

  const hasActiveFilter =
    searchText.trim().length > 0 ||
    selectedCompany !== 'all' ||
    !filterByMapBounds ||
    selectedRoute !== null;

  const filteredRoutes = useMemo(() => {
    if (!hasActiveFilter) return [];
    if (!filterByMapBounds || !mapBounds) return baseMatches;
    return baseMatches.filter((r) => routeIntersectsBounds(r.center, r.path, mapBounds));
  }, [hasActiveFilter, baseMatches, filterByMapBounds, mapBounds]);

  // Live nearby TransMetro buses
  const nearbyTransmetroRoutes = useMemo(() => {
    const q = normalizeText(searchText.trim());
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
    searchText,
    selectedCompany,
    radiusFilter,
    onlyToDestination,
    selectedDestination,
  ]);

  // Live nearby company buses
  const nearbyCompanyRoutes = useMemo(() => {
    const q = normalizeText(searchText.trim());
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
    searchText,
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

  const totalNearbyCount = nearbyTransmetroRoutes.length + nearbyCompanyRoutes.length;

  const handleSelectRoute = useCallback(
    (route: CompanyRouteItem) => {
      setSelectedRoute(route);
      triggerSignal('focus', route.center, 14);
      setToastMsg(`${route.company} · Ruta ${route.code}`);
    },
    [triggerSignal]
  );

  const handleOpenPanel = () => {
    setDrawerTab(hasActiveFilter ? 'filtered' : 'nearby');
    setPanelOpen(true);
  };

  return (
    <div className="@container relative w-full h-full max-w-[960px] mx-auto bg-white flex flex-col overflow-hidden border-x border-slate-200">
      {/* Unified Live Barranquilla Map (Full-bleed with compact floating filter bar) */}
      <main className="relative flex-1 min-h-[220px] w-full bg-[#E8ECEF] overflow-hidden">
        {/* Slim Single-Row Floating Search + Company Filter */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-30 pointer-events-none">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[12px] shadow-md border border-slate-200 p-1.5 flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0 flex items-center">
              <Search
                aria-hidden="true"
                className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 z-10 pointer-events-none"
              />
              <input
                type="text"
                aria-label="Buscar ruta, código, empresa o barrio"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (e.target.value.trim()) setDrawerTab('filtered');
                }}
                placeholder="Buscar ruta, barrio o vía..."
                className="w-full h-8 pl-8 pr-6 py-0 leading-normal rounded-[8px] bg-slate-100/90 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  aria-label="Limpiar búsqueda"
                  className="p-1 absolute right-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              aria-label="Filtrar por empresa"
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                if (e.target.value !== 'all') setDrawerTab('filtered');
              }}
              className="w-[136px] @[480px]:w-[185px] shrink-0 h-8 px-2 py-0 rounded-[8px] bg-slate-100/90 border border-slate-200 text-[11.5px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488] truncate"
            >
              <option value="all">Todas ({BUS_COMPANIES.length})</option>
              {BUS_COMPANIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>
        <BarranquillaPassengerMap
          routeFilter={routeFilter}
          showTrafficLayer={showTrafficLayer}
          showCorridors={showCorridors}
          busT01Position={busT01Position}
          busA12Position={busA12Position}
          userPosition={userPosition}
          originMarker={originMarker}
          selectedDestination={selectedDestination}
          selectedCompanyRoute={selectedRoute}
          catalogRoutes={filteredRoutes}
          userRadiusMeters={radiusFilter}
          nearbyBuses={nearbyBusMarkers}
          signal={mapSignal}
          onBoundsChanged={handleBoundsChanged}
          onSelectCatalogRoute={handleSelectRoute}
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
            if (found) setSelectedRoute(found);
            triggerSignal('focus', bus.position, 15);
            setToastMsg(
              `${bus.company} (${bus.code}) • a ${formatDistanceLabel(bus.distanceMeters)} • ${bus.etaMinutes} min`
            );
          }}
        />

        {/* Compact Active Trip Summary Pill (visible when pickup/destination chosen via +) */}
        {(originMarker || selectedDestination) && (
          <div className="absolute top-[58px] left-2.5 right-14 z-20 pointer-events-auto">
            <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSearchOpenNonce((n) => n + 1)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
              >
                <Compass className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {originMarker ? originMarker.name : 'Tu ubicación'} →{' '}
                  {selectedDestination ? selectedDestination.name : 'Elegir destino'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOriginMarker(null);
                  setOriginQuery('Mi ubicación actual (GPS)');
                  setSelectedDestination(null);
                  setDestQuery('');
                  setOnlyToDestination(false);
                }}
                aria-label="Limpiar ruta seleccionada"
                className="p-0.5 text-slate-400 hover:text-slate-700 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Map Utility Controls (GPS, Layers, Report) */}
        <aside
          aria-label="Controles del mapa"
          className="absolute right-2.5 top-[58px] z-20 flex flex-col gap-1.5"
        >
          <button
            type="button"
            onClick={handleLocateUser}
            aria-label="Ubicar mi posición GPS"
            className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm text-slate-900 shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
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
            className={`w-9 h-9 rounded-full shadow-md border flex items-center justify-center active:scale-95 transition-all ${
              showTrafficLayer
                ? 'bg-slate-900 text-teal-400 border-slate-700'
                : 'bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            aria-label="Reportar incidente"
            className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm text-slate-900 shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          </button>
        </aside>

        {/* Clickable trigger pill to open the hidden bottom panel */}
        {!panelOpen && (
          <button
            type="button"
            onClick={handleOpenPanel}
            aria-expanded={false}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-lg flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all whitespace-nowrap"
          >
            <Route className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>
              {hasActiveFilter
                ? `Ver rutas filtradas (${filteredRoutes.length})`
                : `Ver buses y rutas (${totalNearbyCount})`}
            </span>
            <ChevronUp className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </main>

      {/* Collapsible Bottom Drawer (Nearby Live Buses + Filtered Routes) */}
      {panelOpen && (
        <section
          aria-label="Buses cercanos y rutas filtradas"
          className="relative z-30 shrink-0 min-h-0 max-h-[58%] bg-white rounded-t-[20px] shadow-[0_-6px_24px_rgba(0,0,0,0.1)] border-t border-slate-200 px-3.5 pt-1.5 pb-3 flex flex-col gap-2 transition-all"
        >
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label="Ocultar panel de rutas"
            className="w-10 h-1 bg-slate-300 rounded-full mx-auto hover:bg-slate-400 transition-colors"
          />

          {/* Drawer Tabs & Controls */}
          <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full">
              <button
                type="button"
                onClick={() => setDrawerTab('nearby')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  drawerTab === 'nearby'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Buses cerca ({totalNearbyCount})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('filtered')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  drawerTab === 'filtered'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rutas filtradas ({filteredRoutes.length})
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {drawerTab === 'nearby' ? (
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  className={`min-h-[28px] px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                    showFilters || onlyToDestination
                      ? 'bg-teal-50 text-[#0D9488] border-[#0D9488]'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Radio</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFilterByMapBounds((v) => !v)}
                  aria-pressed={filterByMapBounds}
                  className={`min-h-[28px] px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                    filterByMapBounds
                      ? 'bg-teal-50 text-[#0D9488] border-[#0D9488]'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {filterByMapBounds ? 'Según el mapa ✓' : 'Ver todas'}
                </button>
              )}
              {selectedRoute && (
                <button
                  type="button"
                  onClick={() => setSelectedRoute(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 font-medium"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-0.5"
              >
                <span>Ocultar</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Radius & Destination Filters (when Buses cerca tab active & expanded) */}
          {drawerTab === 'nearby' && showFilters && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pt-1 border-t border-slate-100 shrink-0">
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
          )}

          {/* Drawer Results Grid */}
          <div className="flex-1 min-h-0 grid grid-cols-1 @[560px]:grid-cols-2 gap-2 overflow-y-auto pr-0.5 pb-14 content-start">
            {drawerTab === 'nearby' ? (
              totalNearbyCount === 0 ? (
                <div className="col-span-full py-5 text-center text-xs text-slate-500 space-y-2">
                  <p>No hay buses dentro de este radio con los filtros aplicados.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setRadiusFilter(null);
                      setSelectedCompany('all');
                      setSearchText('');
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
                    const isSelected = selectedRoute?.id === route.id;
                    return (
                      <article
                        key={route.id}
                        onClick={() => {
                          setSelectedRoute(route);
                          triggerSignal('focus', liveBusPos, 15);
                          setToastMsg(
                            `${route.company} · ${route.code} a ${formatDistanceLabel(distanceMeters)}`
                          );
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
              )
            ) : !hasActiveFilter ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500 space-y-2">
                <p>
                  Aplica un filtro arriba (búsqueda o empresa) para mostrar solo las rutas
                  filtradas.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterByMapBounds(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-medium hover:bg-teal-700"
                  >
                    Mostrar todas ({COMPANY_BUS_ROUTES.length})
                  </button>
                </div>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500 space-y-2">
                <p>No hay rutas visibles en esta área del mapa con los filtros actuales.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterByMapBounds(false);
                      setSearchText('');
                      setSelectedCompany('all');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
                  >
                    Mostrar las {COMPANY_BUS_ROUTES.length} rutas
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerSignal('reset')}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                  >
                    Alejar mapa
                  </button>
                </div>
              </div>
            ) : (
              filteredRoutes.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                return (
                  <article
                    key={route.id}
                    onClick={() => handleSelectRoute(route)}
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
                          <h3 className="text-xs font-bold text-slate-900 leading-snug">
                            {route.company}
                          </h3>
                          <p className="text-xs text-slate-700 leading-snug mt-0.5">
                            {route.description}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                            {route.corridor}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {formatCOP(route.fareCop)}
                        </span>
                        <p className="text-[10px] text-emerald-700 font-semibold tabular-nums">
                          c/{route.etaMinutes} min
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Trazada en mapa' : 'Ver recorrido'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('billetera');
                        }}
                        className="min-h-8 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium active:scale-95 transition-all"
                      >
                        QR Pasaje
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      <PassengerBottomNav
        currentScreen="rutas"
        balance={balance}
        tripPlanner={tripPlanner}
        onNavigate={onNavigate}
        onDestinationCleared={() => setOnlyToDestination(false)}
        externalOpenNonce={searchOpenNonce}
      />

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
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 max-w-[90%] whitespace-nowrap ${
            originMarker || selectedDestination ? 'top-[102px]' : 'top-[58px]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
