import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {
  Bus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Filter,
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
import {
  resolvePlaceFromText,
  useAutocompleteSuggestions,
} from '../hooks/useAutocompleteSuggestions';
import type {
  LatLng,
  MapBounds,
  PlacePoint,
  RouteFilter,
  ScreenId,
  TransitStation,
  TripPlannerState,
} from '../types/transit';
import {
  BarranquillaPassengerMap,
  type MapControlSignal,
  type NearbyBusMarker,
  type RouteDirectionMode,
} from './BarranquillaMaps';
import {PassengerBottomNav} from './PassengerBottomNav';
import {PWAInstallButton} from './PWAInstallButton';

const COMPANY_BADGE_CLASSES: Record<string, string> = {
  Coolitoral: 'bg-cyan-600',
  Coochofal: 'bg-teal-600',
  Sobusa: 'bg-amber-600',
  Sobrusa: 'bg-amber-500',
  'La Carolina': 'bg-indigo-600',
  Sodis: 'bg-purple-500',
  Sodetrans: 'bg-pink-600',
  Transmetro: 'bg-blue-600',
  Transmecar: 'bg-emerald-600',
  Transdiaz: 'bg-rose-600',
  Transurbar: 'bg-orange-700',
  Transoledad: 'bg-teal-700',
  Trasalfa: 'bg-purple-600',
  Trasalianco: 'bg-violet-600',
  Monterrey: 'bg-green-600',
  'Lucero San Felipe': 'bg-pink-700',
  Cootransnorte: 'bg-violet-700',
  Cootrantico: 'bg-sky-600',
  Cootrab: 'bg-lime-600',
  Cootransco: 'bg-sky-700',
  Cootransporcar: 'bg-emerald-700',
  Lolaya: 'bg-red-600',
  Cootrasol: 'bg-cyan-700',
  Cooasoatlán: 'bg-orange-600',
  Embusa: 'bg-yellow-600',
  'Flota Ángulo': 'bg-indigo-700',
  'Flota Roja': 'bg-red-700',
  Excolcar: 'bg-blue-500',
  Tubara: 'bg-cyan-500',
  Otra: 'bg-slate-600',
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

function findNearestPathIndex(point: LatLng, path: LatLng[]): number {
  if (path.length <= 1) return 0;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dLat = path[i].lat - point.lat;
    const dLng = path[i].lng - point.lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < bestDist) {
      bestDist = distSq;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function interpolateNearIndex(path: LatLng[], anchorIdx: number, progress: number): LatLng {
  if (path.length === 0) return BARRANQUILLA_PASSENGER_CENTER;
  if (path.length === 1) return path[0];
  // Move smoothly along a local ~10-vertex window around anchorIdx so the bus approaches near the user
  const windowSize = Math.min(8, Math.max(2, Math.floor(path.length * 0.15)));
  const startIdx = Math.max(0, Math.min(path.length - 2, anchorIdx - Math.floor(windowSize / 2)));
  const endIdx = Math.min(path.length - 1, startIdx + windowSize);
  const clamped = ((progress % 1) + 1) % 1;
  const scaled = startIdx + clamped * (endIdx - startIdx);
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
}

export function PassengerRoutesScreen({
  balance,
  userPosition,
  tripPlanner,
  pendingMapFocus,
  onClearPendingMapFocus,
  onUpdateUserPosition,
  onNavigate,
}: PassengerRoutesScreenProps) {
  const placesLib = useMapsLibrary('places');
  const topSearchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    originMarker,
    selectedDestination,
    tripSubmittedNonce,
    setOriginMarker,
    setOriginQuery,
    setSelectedDestination,
    setDestQuery,
  } = tripPlanner;

  // Catalog filter state (left-side drawer opened via Rutas button)
  const [routesSearchOpen, setRoutesSearchOpen] = useState(false);
  const [sideMenuTab, setSideMenuTab] = useState<'companies' | 'routes'>('companies');
  const [searchText, setSearchText] = useState('');
  const [topSearchFocused, setTopSearchFocused] = useState(false);
  const [isResolvingTopPlace, setIsResolvingTopPlace] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [filterByMapBounds, setFilterByMapBounds] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<CompanyRouteItem | null>(null);
  const [routeDirectionMode, setRouteDirectionMode] = useState<RouteDirectionMode>('both');
  const [showRouteTextDetails, setShowRouteTextDetails] = useState(false);

  // Live nearby bus state (from Explorar)
  const [radiusFilter, setRadiusFilter] = useState<number | null>(1000);
  const [onlyToDestination, setOnlyToDestination] = useState(false);
  const [routeFilter] = useState<RouteFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Unified hidden-by-default drawer & modals
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'nearby' | 'filtered'>('nearby');
  const [searchOpenNonce, setSearchOpenNonce] = useState(0);
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [mapSignal, setMapSignal] = useState<MapControlSignal | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const triggerSignal = useCallback(
    (
      type: MapControlSignal['type'],
      target?: LatLng,
      zoom?: number,
      boundsPoints?: LatLng[]
    ) => {
      setMapSignal({type, target, zoom, boundsPoints, nonce: Date.now()});
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

  const {
    suggestions: topPlaceSuggestions,
    isLoading: isTopPlacesLoading,
    error: topPlacesError,
    resetSession: resetTopPlacesSession,
  } = useAutocompleteSuggestions(
    searchText,
    topSearchFocused && searchText.trim().length >= 2,
    activeOrigin
  );

  useEffect(() => {
    if (tripSubmittedNonce <= 0) return;
    if (selectedDestination) {
      setOnlyToDestination(true);
      setRadiusFilter(null);
      setDrawerTab('nearby');
      setPanelOpen(true);
      triggerSignal('fitBounds', selectedDestination.position, 14, [
        activeOrigin,
        selectedDestination.position,
      ]);
    } else if (originMarker) {
      setDrawerTab('nearby');
      setPanelOpen(true);
      triggerSignal('focus', originMarker.position, 15);
    }
  }, [tripSubmittedNonce, selectedDestination, originMarker, activeOrigin, triggerSignal]);

  useEffect(() => {
    if (!routesSearchOpen) {
      setTopSearchFocused(false);
      return;
    }
    setPanelOpen(false);
  }, [routesSearchOpen]);

  const applyDestinationFromPlaces = useCallback(
    (point: PlacePoint) => {
      setSelectedDestination(point);
      setDestQuery(point.name);
      setOnlyToDestination(true);
      setRadiusFilter(null);
      setDrawerTab('nearby');
      setPanelOpen(true);
      setTopSearchFocused(false);
      setRoutesSearchOpen(false);
      setSearchText('');
      triggerSignal('fitBounds', point.position, 14, [activeOrigin, point.position]);
      setToastMsg(`Destino: ${point.name}`);
    },
    [activeOrigin, setDestQuery, setSelectedDestination, triggerSignal]
  );

  const handleSelectTopPlaceSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    setIsResolvingTopPlace(true);
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const loc = place.location;
      if (loc) {
        const name =
          place.displayName ??
          suggestion.placePrediction.mainText?.text ??
          suggestion.placePrediction.text.text;
        const address =
          place.formattedAddress ??
          suggestion.placePrediction.secondaryText?.text ??
          'Barranquilla, Atlántico';
        applyDestinationFromPlaces({
          name,
          address,
          position: {lat: loc.lat(), lng: loc.lng()},
        });
        resetTopPlacesSession();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setToastMsg('No se pudo obtener la ubicación de ese lugar');
    } finally {
      setIsResolvingTopPlace(false);
    }
  };

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

  const toggleCompany = useCallback((companyName: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyName)
        ? prev.filter((c) => c !== companyName)
        : [...prev, companyName]
    );
    setDrawerTab('filtered');
  }, []);

  // Filtered routes catalog (all 145 merged AMBQ + RutaQuilla + Transmetro routes)
  const baseMatches = useMemo(() => {
    const q = normalizeText(searchText.trim());
    return COMPANY_BUS_ROUTES.filter((r) => {
      const matchesCompany =
        selectedCompanies.length === 0 || selectedCompanies.includes(r.company);
      const matchesQuery =
        !q ||
        normalizeText(r.code).includes(q) ||
        normalizeText(r.name).includes(q) ||
        normalizeText(r.company).includes(q) ||
        normalizeText(r.description).includes(q) ||
        normalizeText(r.corridor).includes(q) ||
        normalizeText(r.recorridoTextual.ida).includes(q) ||
        normalizeText(r.recorridoTextual.regreso).includes(q);
      return matchesCompany && matchesQuery;
    });
  }, [searchText, selectedCompanies]);

  const hasRouteFilter =
    searchText.trim().length > 0 || selectedCompanies.length > 0;

  const filteredRoutes = useMemo(() => {
    if (!hasRouteFilter) return [];
    if (!filterByMapBounds || !mapBounds) return baseMatches;
    return baseMatches.filter((r) => {
      const pts = r.segments ? r.segments.flat() : [...r.path, ...r.returnPath];
      return routeIntersectsBounds(r.center, pts, mapBounds);
    });
  }, [hasRouteFilter, baseMatches, filterByMapBounds, mapBounds]);

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
        if (selectedCompanies.length > 0 && !selectedCompanies.includes('Transmetro')) return false;
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
    selectedCompanies,
    radiusFilter,
    onlyToDestination,
    selectedDestination,
  ]);

  // Precompute static polyline distances only when origin/destination changes (keeps 2.5s tick instant)
  const staticRouteDistances = useMemo(() => {
    return COMPANY_BUS_ROUTES.map((route) => {
      const distanceToRoute = getDistanceToPolylineMeters(activeOrigin, route.path);
      const nearestIdx = findNearestPathIndex(activeOrigin, route.path);
      const destDist = selectedDestination
        ? getDistanceToPolylineMeters(selectedDestination.position, route.path)
        : null;
      return {distanceToRoute, nearestIdx, destDist};
    });
  }, [activeOrigin, selectedDestination]);

  // Live nearby company buses
  const nearbyCompanyRoutes = useMemo(() => {
    const q = normalizeText(searchText.trim());
    const mapped = COMPANY_BUS_ROUTES.map((route, idx) => {
      const {distanceToRoute, nearestIdx, destDist} = staticRouteDistances[idx];
      const speedSeed = ((tick * 0.06 + idx * 0.19) % 1 + 1) % 1;
      const liveBusPos = interpolateNearIndex(route.path, nearestIdx, speedSeed);
      const busDistanceMeters = getDistanceMeters(activeOrigin, liveBusPos);
      const effectiveDist = Math.min(distanceToRoute, busDistanceMeters);
      const liveEta = Math.max(
        1,
        Math.min(18, Math.round(effectiveDist / 190) + (route.etaMinutes % 3))
      );

      return {
        route,
        liveBusPos,
        distanceMeters: effectiveDist,
        busDistanceMeters,
        destDistanceMeters: destDist,
        liveEta,
        servesDestination: destDist !== null ? destDist <= 1800 : false,
      };
    }).filter((item) => {
      if (selectedCompanies.length > 0 && !selectedCompanies.includes(item.route.company)) {
        return false;
      }
      if (radiusFilter !== null && item.distanceMeters > radiusFilter) return false;
      if (
        q &&
        !normalizeText(item.route.company).includes(q) &&
        !normalizeText(item.route.code).includes(q) &&
        !normalizeText(item.route.name).includes(q) &&
        !normalizeText(item.route.description).includes(q) &&
        !normalizeText(item.route.corridor).includes(q)
      ) {
        return false;
      }
      return true;
    });

    if (onlyToDestination && selectedDestination) {
      const serving = mapped.filter((item) => item.servesDestination);
      if (serving.length > 0) {
        return serving.sort((a, b) => a.distanceMeters - b.distanceMeters);
      }
      return [...mapped]
        .sort(
          (a, b) =>
            (a.destDistanceMeters ?? a.distanceMeters) -
            (b.destDistanceMeters ?? b.distanceMeters)
        )
        .slice(0, 6);
    }

    return mapped.sort((a, b) => {
      if (selectedDestination) {
        const diff = Number(b.servesDestination) - Number(a.servesDestination);
        if (diff !== 0) return diff;
      }
      return a.distanceMeters - b.distanceMeters;
    });
  }, [
    activeOrigin,
    staticRouteDistances,
    tick,
    searchText,
    selectedCompanies,
    radiusFilter,
    onlyToDestination,
    selectedDestination,
  ]);

  const nearbyBusMarkers: NearbyBusMarker[] = useMemo(() => {
    return nearbyCompanyRoutes.slice(0, 12).map((item) => ({
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
      setRouteDirectionMode('both');
      setShowRouteTextDetails(false);
      setPanelOpen(false);
      const allPoints = [
        ...(route.segments ? route.segments.flat() : route.path),
        ...route.returnPath,
      ];
      if (allPoints.length >= 2) {
        triggerSignal('fitBounds', route.center, 14, allPoints);
      } else {
        triggerSignal('focus', route.center, 14);
      }
      setToastMsg(`${route.company} · ${route.name}`);
    },
    [triggerSignal]
  );

  const handleTopSearchSubmit = async () => {
    const trimmed = searchText.trim();
    if (!trimmed) return;

    // Prioritize top Places suggestion if user typed a place name/address
    if (topPlaceSuggestions.length > 0) {
      const firstPred = topPlaceSuggestions[0];
      if (firstPred.placePrediction) {
        await handleSelectTopPlaceSuggestion(firstPred);
        return;
      }
    }

    if (baseMatches.length > 0 && baseMatches.length <= 6) {
      setTopSearchFocused(false);
      setRoutesSearchOpen(false);
      setDrawerTab('filtered');
      setPanelOpen(true);
      handleSelectRoute(baseMatches[0]);
      return;
    }

    if (placesLib) {
      setIsResolvingTopPlace(true);
      try {
        const resolved = await resolvePlaceFromText(placesLib, trimmed, activeOrigin);
        if (resolved) {
          applyDestinationFromPlaces(resolved);
          resetTopPlacesSession();
          return;
        }
      } finally {
        setIsResolvingTopPlace(false);
      }
    }

    if (baseMatches.length > 0) {
      setTopSearchFocused(false);
      setRoutesSearchOpen(false);
      setDrawerTab('filtered');
      setPanelOpen(true);
      return;
    }

    setToastMsg('No se encontraron rutas ni lugares para esa búsqueda');
  };

  const handleOpenPanel = () => {
    setDrawerTab(hasRouteFilter ? 'filtered' : 'nearby');
    setPanelOpen(true);
  };

  return (
    <div className="@container relative w-full h-full max-w-[960px] mx-auto bg-white flex flex-col overflow-hidden border-x border-slate-200">
      {/* Unified Live Barranquilla Map (Full-bleed with compact floating filter bar) */}
      <main className="relative flex-1 min-h-[220px] w-full bg-[#E8ECEF] overflow-hidden">
        {/* Left Slide-Out Route Filter Side Menu (triggered by Rutas nav button) */}
        <div
          aria-hidden={!routesSearchOpen}
          onClick={() => setRoutesSearchOpen(false)}
          className={`absolute inset-0 z-30 bg-slate-900/30 backdrop-blur-[1px] transition-opacity duration-200 ${
            routesSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        <aside
          role="dialog"
          aria-label="Menú lateral de filtro de rutas"
          aria-hidden={!routesSearchOpen}
          className={`absolute top-0 bottom-0 left-0 z-40 w-[85%] max-w-[325px] bg-white shadow-2xl border-r border-slate-200 flex flex-col transition-transform duration-250 ease-out ${
            routesSearchOpen
              ? 'translate-x-0 pointer-events-auto'
              : '-translate-x-full pointer-events-none'
          }`}
        >
          {/* Side Menu Header */}
          <div className="px-3.5 py-3 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 bg-slate-50/70">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[10px] bg-teal-50 border border-teal-200 text-[#0D9488] flex items-center justify-center shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
                  Filtrar rutas
                </h2>
                <p className="text-[11px] text-slate-500 truncate">
                  {selectedCompanies.length > 0
                    ? `${selectedCompanies.length} empresa${selectedCompanies.length === 1 ? '' : 's'} · ${filteredRoutes.length} rutas`
                    : hasRouteFilter
                    ? `${filteredRoutes.length} rutas encontradas`
                    : 'Selecciona empresas o busca línea'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(hasRouteFilter || filterByMapBounds) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanies([]);
                    setSearchText('');
                    setFilterByMapBounds(false);
                    setSelectedRoute(null);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-[#0D9488] hover:bg-teal-50 transition-colors"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => setRoutesSearchOpen(false)}
                aria-label="Cerrar menú lateral de rutas"
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Input + Inline Autocomplete */}
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 shrink-0 space-y-2 relative">
            <div className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 z-10 pointer-events-none"
              />
              <input
                ref={topSearchInputRef}
                type="text"
                aria-label="Buscar ruta, barrio, lugar o dirección"
                value={searchText}
                onFocus={() => setTopSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setTopSearchFocused(false), 150);
                }}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setTopSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleTopSearchSubmit();
                  } else if (e.key === 'Escape') {
                    setTopSearchFocused(false);
                    setRoutesSearchOpen(false);
                  }
                }}
                placeholder="Buscar barrio, ruta o dirección..."
                className="w-full h-9 pl-8 pr-7 py-0 leading-normal rounded-[10px] bg-slate-100 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white border border-slate-200/70"
              />
              {searchText && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchText('');
                    resetTopPlacesSession();
                  }}
                  aria-label="Limpiar búsqueda"
                  className="p-1 absolute right-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Side Menu Section Tabs: Empresas vs Rutas filtradas */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-[10px]">
              <button
                type="button"
                onClick={() => setSideMenuTab('companies')}
                className={`py-1.5 px-2 rounded-[8px] text-[11.5px] font-semibold transition-colors ${
                  sideMenuTab === 'companies'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Empresas ({BUS_COMPANIES.length})
              </button>
              <button
                type="button"
                onClick={() => setSideMenuTab('routes')}
                className={`py-1.5 px-2 rounded-[8px] text-[11.5px] font-semibold transition-colors ${
                  sideMenuTab === 'routes'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rutas ({filteredRoutes.length})
              </button>
            </div>

            {/* Places + Quick Route Suggestions Dropdown */}
            {topSearchFocused && searchText.trim().length >= 2 && (
              <div
                role="listbox"
                aria-label="Resultados de lugares y rutas"
                className="absolute left-3 right-3 top-[48px] z-50 bg-white rounded-[12px] shadow-2xl border border-slate-200 overflow-hidden max-h-[45vh] overflow-y-auto divide-y divide-slate-100"
              >
                {(isTopPlacesLoading || isResolvingTopPlace) && (
                  <div className="px-3 py-2 flex items-center gap-2 text-xs text-slate-500 bg-slate-50/70">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                    <span>Buscando en Google Places...</span>
                  </div>
                )}

                {topPlaceSuggestions.map((suggestion, idx) => {
                  const pred = suggestion.placePrediction;
                  if (!pred) return null;
                  const main = pred.mainText?.text ?? pred.text.text;
                  const secondary = pred.secondaryText?.text ?? '';
                  return (
                    <button
                      key={pred.placeId ?? `top-place-${idx}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void handleSelectTopPlaceSuggestion(suggestion)}
                      className="w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-teal-50/60 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3" />
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

                {baseMatches.slice(0, 4).map((route) => (
                  <button
                    key={`top-route-${route.id}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setTopSearchFocused(false);
                      setRoutesSearchOpen(false);
                      handleSelectRoute(route);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className={`px-1.5 py-0.5 ${getCompanyBadgeClass(
                        route.company
                      )} text-white font-headline text-[10.5px] font-bold rounded shrink-0`}
                    >
                      {route.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {route.company} · {route.description}
                      </p>
                      <p className="text-[10.5px] text-slate-500 truncate">{route.corridor}</p>
                    </div>
                  </button>
                ))}

                {!isTopPlacesLoading &&
                  !isResolvingTopPlace &&
                  topPlaceSuggestions.length === 0 &&
                  baseMatches.length === 0 && (
                    <div
                      className={`px-3 py-2.5 text-xs ${
                        topPlacesError ? 'text-amber-700 bg-amber-50' : 'text-slate-500'
                      }`}
                    >
                      {topPlacesError ??
                        'Sin sugerencias exactas. Presiona Enter para buscar.'}
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Scrollable Side Menu Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2">
            {sideMenuTab === 'companies' ? (
              <>
                <div className="flex items-center justify-between gap-2 pb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Empresas operadoras
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterByMapBounds((v) => !v)}
                    aria-pressed={filterByMapBounds}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border transition-colors ${
                      filterByMapBounds
                        ? 'bg-teal-50 text-[#0D9488] border-[#0D9488]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {filterByMapBounds ? 'Según el mapa ✓' : 'Toda la ciudad'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {BUS_COMPANIES.map((c) => {
                    const checked = selectedCompanies.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggleCompany(c.name)}
                        className={`w-full px-2.5 py-2 rounded-[10px] border text-left flex items-center gap-2.5 text-xs transition-colors ${
                          checked
                            ? 'bg-teal-50/90 border-[#0D9488] text-slate-900 font-semibold'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-[#0D9488] border-[#0D9488] text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${getCompanyBadgeClass(
                            c.name
                          )}`}
                        />
                        <span className="truncate flex-1">{c.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">
                          {c.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : !hasRouteFilter ? (
              <div className="py-8 px-2 text-center text-xs text-slate-500 space-y-3">
                <p>
                  No hay rutas mostradas por defecto. Selecciona una o más empresas o escribe una línea para ver su trazado en el mapa.
                </p>
                <button
                  type="button"
                  onClick={() => setSideMenuTab('companies')}
                  className="px-3.5 py-2 rounded-lg bg-[#0D9488] text-white font-semibold text-xs hover:bg-teal-700 transition-colors"
                >
                  Elegir empresas
                </button>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="py-8 px-2 text-center text-xs text-slate-500 space-y-2.5">
                <p>No hay rutas en esta vista con los filtros actuales.</p>
                {filterByMapBounds && (
                  <button
                    type="button"
                    onClick={() => setFilterByMapBounds(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
                  >
                    Ver en toda la ciudad
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredRoutes.map((route) => {
                  const isSelected = selectedRoute?.id === route.id;
                  return (
                    <button
                      key={`side-route-${route.id}`}
                      type="button"
                      onClick={() => {
                        setRoutesSearchOpen(false);
                        handleSelectRoute(route);
                      }}
                      className={`w-full p-2.5 rounded-[10px] border text-left transition-colors ${
                        isSelected
                          ? 'bg-teal-50 border-[#0D9488] ring-1 ring-[#0D9488]'
                          : 'bg-slate-50/70 border-slate-200 hover:border-[#0D9488]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 ${getCompanyBadgeClass(
                              route.company
                            )} text-white font-headline text-[11px] font-bold rounded shrink-0 mt-0.5`}
                          >
                            {route.code}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {route.name}
                            </p>
                            <p className="text-[11px] text-slate-600 truncate">
                              {route.company} · {route.corridor}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-900 shrink-0">
                          {formatCOP(route.fareCop)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Menu Sticky Footer */}
          <div className="p-3 border-t border-slate-200 bg-white shrink-0 flex items-center gap-2">
            {hasRouteFilter ? (
              <>
                <button
                  type="button"
                  onClick={() => setRoutesSearchOpen(false)}
                  className="flex-1 h-9 px-3 rounded-[10px] bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    Ver {filteredRoutes.length}{' '}
                    {filteredRoutes.length === 1 ? 'ruta' : 'rutas'} en mapa
                  </span>
                </button>
                {sideMenuTab === 'companies' && filteredRoutes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSideMenuTab('routes')}
                    className="h-9 px-2.5 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold shrink-0 transition-colors"
                  >
                    Lista
                  </button>
                )}
              </>
            ) : (
              <p className="text-[11px] text-slate-500 text-center w-full">
                Marca una o más empresas para trazar sus rutas en el mapa
              </p>
            )}
          </div>
        </aside>
        <BarranquillaPassengerMap
          routeFilter={routeFilter}
          showTrafficLayer={false}
          showCorridors={false}
          busT01Position={busT01Position}
          busA12Position={busA12Position}
          userPosition={userPosition}
          originMarker={originMarker}
          selectedDestination={selectedDestination}
          selectedCompanyRoute={selectedRoute}
          routeDirectionMode={routeDirectionMode}
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
            if (found) handleSelectRoute(found);
            else triggerSignal('focus', bus.position, 15);
            setToastMsg(
              `${bus.company} (${bus.code}) • a ${formatDistanceLabel(bus.distanceMeters)} • ${bus.etaMinutes} min`
            );
          }}
          onSelectMapPoi={(place) => {
            applyDestinationFromPlaces(place);
          }}
        />

        {/* Compact Floating PWA Install Prompt (auto-hidden when installed or unsupported) */}
        {!(originMarker || selectedDestination) && !selectedRoute && (
          <div className="absolute top-2.5 left-2.5 z-20 pointer-events-auto">
            <PWAInstallButton variant="compact" />
          </div>
        )}

        {/* Compact Active Trip Summary Pill (visible when pickup/destination chosen via + or search) */}
        {(originMarker || selectedDestination) && (
          <div className="absolute top-2.5 left-2.5 right-14 z-20 pointer-events-auto transition-all">
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

        {/* Floating Map Utility Control (GPS) */}
        <aside
          aria-label="Controles del mapa"
          className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1.5 transition-all"
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
        </aside>

        {/* Floating Selected Route Legend & Details Card (RutaQuilla Ida/Regreso style) */}
        {selectedRoute && !(originMarker || selectedDestination) && (
          <div className="absolute top-2.5 left-2.5 right-14 z-20 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-[14px] shadow-xl border border-slate-200 p-2.5 space-y-2 max-w-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={`px-2 py-0.5 ${getCompanyBadgeClass(
                      selectedRoute.company
                    )} text-white font-headline text-xs font-bold rounded-[6px] shrink-0 mt-0.5`}
                  >
                    {selectedRoute.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedRoute.name}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate">
                      {selectedRoute.company} · {formatCOP(selectedRoute.fareCop)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoute(null);
                    setShowRouteTextDetails(false);
                  }}
                  aria-label="Cerrar ruta seleccionada"
                  className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Ida / Regreso / Ambos direction toggle pills or official AMBQ trace label */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {selectedRoute.returnPath.length >= 2 ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRouteDirectionMode('both')}
                      className={`px-2 py-1 rounded-full text-[10.5px] font-semibold transition-colors ${
                        routeDirectionMode === 'both'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Ida + Vuelta
                    </button>
                    <button
                      type="button"
                      onClick={() => setRouteDirectionMode('ida')}
                      className={`px-2 py-1 rounded-full text-[10.5px] font-semibold flex items-center gap-1 transition-colors ${
                        routeDirectionMode === 'ida'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#2ECC71] border border-white" />
                      <span>Ida</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRouteDirectionMode('regreso')}
                      className={`px-2 py-1 rounded-full text-[10.5px] font-semibold flex items-center gap-1 transition-colors ${
                        routeDirectionMode === 'regreso'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-800 hover:bg-red-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#E74C3C] border border-white" />
                      <span>Vuelta</span>
                    </button>
                  </div>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10.5px] font-semibold inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2ECC71] border border-white" />
                    <span>{selectedRoute.corridor}</span>
                  </span>
                )}

                {(selectedRoute.barriosCubiertos.length > 0 ||
                  selectedRoute.recorridoTextual.ida ||
                  selectedRoute.recorridoTextual.regreso) && (
                  <button
                    type="button"
                    onClick={() => setShowRouteTextDetails((v) => !v)}
                    className="text-[11px] font-semibold text-[#0D9488] hover:underline"
                  >
                    {showRouteTextDetails ? 'Ocultar calles' : 'Barrios y calles'}
                  </button>
                )}
              </div>

              {showRouteTextDetails && (
                <div className="pt-1.5 border-t border-slate-100 space-y-1.5 max-h-36 overflow-y-auto text-[11px] text-slate-700">
                  {selectedRoute.barriosCubiertos.length > 0 && (
                    <p>
                      <strong className="text-slate-900">Barrios:</strong>{' '}
                      {selectedRoute.barriosCubiertos.join(', ')}
                    </p>
                  )}
                  {selectedRoute.recorridoTextual.ida && (
                    <p>
                      <strong className="text-emerald-700">Ida:</strong>{' '}
                      {selectedRoute.recorridoTextual.ida}
                    </p>
                  )}
                  {selectedRoute.recorridoTextual.regreso && (
                    <p>
                      <strong className="text-red-700">Regreso:</strong>{' '}
                      {selectedRoute.recorridoTextual.regreso}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clickable trigger pill to open the hidden bottom panel */}
        {!panelOpen && !routesSearchOpen && (
          <button
            type="button"
            onClick={handleOpenPanel}
            aria-expanded={false}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-lg flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all whitespace-nowrap"
          >
            <Route className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>
              {hasRouteFilter
                ? `Ver rutas (${filteredRoutes.length})`
                : `Buses cerca (${totalNearbyCount})`}
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
                hasRouteFilter && (
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
                    {filterByMapBounds ? 'Según el mapa ✓' : 'Toda la ciudad'}
                  </button>
                )
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
                      setSelectedCompanies([]);
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
                          setPanelOpen(false);
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
                                onNavigate('qr');
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
                          setRouteDirectionMode('both');
                          setShowRouteTextDetails(false);
                          setPanelOpen(false);
                          triggerSignal('fitBounds', liveBusPos, 15, [activeOrigin, liveBusPos]);
                          setToastMsg(
                            `${route.company} · ${route.code} a ${formatDistanceLabel(distanceMeters)}`
                          );
                        }}
                        className={`group p-3 rounded-[14px] border transition-all cursor-pointer ${
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
                            <span className="truncate group-hover:underline">
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
                                onNavigate('qr');
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
            ) : !hasRouteFilter ? (
              <div className="col-span-full py-6 px-3 text-center text-xs text-slate-600 space-y-2.5">
                <p>
                  No hay rutas mostradas por defecto. Selecciona una o más empresas o busca una línea para ver su trazado en el mapa.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPanelOpen(false);
                      setSideMenuTab('companies');
                      setRoutesSearchOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filtrar líneas por empresa</span>
                  </button>
                </div>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500 space-y-2">
                <p>No hay rutas visibles en esta área del mapa con los filtros actuales.</p>
                <div className="flex items-center justify-center gap-2">
                  {filterByMapBounds && (
                    <button
                      type="button"
                      onClick={() => setFilterByMapBounds(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
                    >
                      Ver en toda la ciudad
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFilterByMapBounds(false);
                      setSearchText('');
                      setSelectedCompanies([]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                  >
                    Limpiar filtros
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
                    className={`group p-3 rounded-[14px] border transition-all cursor-pointer ${
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
                            {route.name}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-600 leading-snug">
                            {route.company} · {route.description}
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
                          {route.returnPath.length >= 2 ? 'Ida + Vuelta' : 'Trazado AMBQ'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="group-hover:underline">
                          {isSelected
                            ? route.returnPath.length >= 2
                              ? 'Trazada en mapa (Ida/Vuelta)'
                              : 'Trazada en mapa (AMBQ)'
                            : 'Ver trazado en mapa'}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('qr');
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
        routesSearchOpen={routesSearchOpen}
        onToggleRoutesSearch={() => setRoutesSearchOpen((prev) => !prev)}
        onCloseRoutesSearch={() => setRoutesSearchOpen(false)}
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
                  onNavigate('qr');
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

      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 max-w-[90%] whitespace-nowrap ${
            originMarker || selectedDestination ? 'top-[52px]' : 'top-3'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
