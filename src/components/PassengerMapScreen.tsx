import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bus,
  CheckCircle2,
  ChevronRight,
  Compass,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Mic,
  Minus,
  Monitor,
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
  INITIAL_ROUTE_CARDS,
  TRANSIT_STATIONS,
  USER_GPS_POSITION,
  formatCOP,
} from '../data/barranquillaTransit';
import {useAutocompleteSuggestions} from '../hooks/useAutocompleteSuggestions';
import type {LatLng, RouteFilter, ScreenId, TransitStation} from '../types/transit';
import {BarranquillaPassengerMap, type MapControlSignal} from './BarranquillaMaps';

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

interface PassengerMapScreenProps {
  balance: number;
  onNavigate: (screen: ScreenId) => void;
  onReportIncident: (title: string, description: string) => void;
}

export function PassengerMapScreen({
  balance,
  onNavigate,
  onReportIncident,
}: PassengerMapScreenProps) {
  const placesLib = useMapsLibrary('places');
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<{
    name: string;
    address: string;
    position: LatLng;
  } | null>(null);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);

  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [routeSearchFilter, setRouteSearchFilter] = useState<string>('');
  const [selectedCompanyRoute, setSelectedCompanyRoute] = useState<CompanyRouteItem | null>(null);
  const [showTrafficLayer, setShowTrafficLayer] = useState(false);
  const [showCorridors, setShowCorridors] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportType, setReportType] = useState('Congestión vehicular');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mapSignal, setMapSignal] = useState<MapControlSignal | null>(null);
  const [zoomState, setZoomState] = useState<{zoom: number; isAtDefault: boolean}>({
    zoom: 16,
    isAtDefault: true,
  });

  const {
    suggestions: placeSuggestions,
    isLoading: isSuggestionsLoading,
    error: suggestionsError,
    resetSession,
  } = useAutocompleteSuggestions(searchQuery, dropdownOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subtle live bus telemetry movement along Barranquilla corridors
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % 24);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  const busT01Position: LatLng = useMemo(() => {
    const offset = Math.sin(tick * 0.28) * 0.00055;
    return {lat: 10.9946 + offset, lng: -74.8072 - offset * 0.45};
  }, [tick]);

  const busA12Position: LatLng = useMemo(() => {
    const offset = Math.cos(tick * 0.25) * 0.0005;
    return {lat: 10.9918 + offset * 0.35, lng: -74.8091 + offset};
  }, [tick]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const matchingStations = useMemo(() => {
    const q = normalizeText(searchQuery.trim());
    if (q.length < 2) return [];
    return TRANSIT_STATIONS.filter(
      (st) =>
        normalizeText(st.name).includes(q) || normalizeText(st.subtitle).includes(q)
    );
  }, [searchQuery]);

  const matchingTopBarRoutes = useMemo(() => {
    const q = normalizeText(searchQuery.trim());
    if (q.length < 2) return [];
    return COMPANY_BUS_ROUTES.filter(
      (r) =>
        normalizeText(r.company).includes(q) ||
        normalizeText(r.code).includes(q) ||
        normalizeText(r.description).includes(q) ||
        normalizeText(r.corridor).includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  const filteredRoutes = useMemo(() => {
    if (selectedCompany !== 'all') return [];
    const q = normalizeText((routeSearchFilter || searchQuery).trim());
    if (
      !routeSearchFilter.trim() &&
      selectedDestination &&
      normalizeText(searchQuery.trim()) === normalizeText(selectedDestination.name)
    ) {
      return INITIAL_ROUTE_CARDS.filter(
        (r) => routeFilter === 'all' || r.category === routeFilter
      );
    }
    return INITIAL_ROUTE_CARDS.filter((r) => {
      const matchesCat = routeFilter === 'all' || r.category === routeFilter;
      const matchesSearch =
        !q ||
        normalizeText(r.code).includes(q) ||
        normalizeText(r.name).includes(q) ||
        normalizeText(r.corridor).includes(q) ||
        normalizeText(r.busId).includes(q);
      return matchesCat && matchesSearch;
    });
  }, [routeFilter, searchQuery, routeSearchFilter, selectedCompany, selectedDestination]);

  const filteredCompanyRoutes = useMemo(() => {
    if (routeFilter !== 'all' && selectedCompany === 'all' && !routeSearchFilter.trim()) {
      return [];
    }
    const q = normalizeText(routeSearchFilter.trim());
    return COMPANY_BUS_ROUTES.filter((r) => {
      const matchesCompany =
        selectedCompany === 'all' || r.company === selectedCompany;
      const matchesQuery =
        !q ||
        normalizeText(r.company).includes(q) ||
        normalizeText(r.code).includes(q) ||
        normalizeText(r.description).includes(q) ||
        normalizeText(r.corridor).includes(q);
      return matchesCompany && matchesQuery;
    });
  }, [routeFilter, selectedCompany, routeSearchFilter]);

  const handleCameraSync = useCallback((zoom: number, isAtDefault: boolean) => {
    setZoomState({zoom, isAtDefault});
  }, []);

  const triggerSignal = useCallback(
    (type: MapControlSignal['type'], target?: LatLng, zoom?: number) => {
      setMapSignal({type, target, zoom, nonce: Date.now()});
    },
    []
  );

  const handleCenterGPS = () => {
    triggerSignal('centerUser', USER_GPS_POSITION, 16);
    showToast('Centrado en: Cra 46 con Calle 74 (Barranquilla)');
  };

  const handleToggleLayers = () => {
    setShowTrafficLayer((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Capa de tráfico en vivo activada en Barranquilla'
          : 'Capa de corredores troncales actualizada'
      );
      return next;
    });
    setShowCorridors(true);
  };

  const handleMicSearch = () => {
    setSearchQuery('Portal del Prado');
    setDropdownOpen(true);
    showToast('Búsqueda por voz: "Portal del Prado"');
  };

  const handleSelectCompanyRoute = useCallback(
    (route: CompanyRouteItem, syncFilter = false) => {
      setSelectedCompanyRoute(route);
      setRouteFilter('all');
      if (syncFilter) {
        setSelectedCompany(route.company);
        setSheetExpanded(true);
      }
      setDropdownOpen(false);
      triggerSignal('focus', route.center, 14);
      showToast(`${route.company} · Ruta ${route.code} en mapa`);
    },
    [showToast, triggerSignal]
  );

  const handleSelectStationSuggestion = (station: TransitStation) => {
    setSelectedDestination({
      name: station.name,
      address: station.subtitle,
      position: station.position,
    });
    setSearchQuery(station.name);
    setDropdownOpen(false);
    resetSession();
    triggerSignal('focus', station.position, 17);
    showToast(`Estación seleccionada: ${station.name}`);
  };

  const handleSelectPlaceSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    setIsResolvingPlace(true);
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
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

        setSelectedDestination({name, address, position});
        setSearchQuery(name);
        setDropdownOpen(false);
        resetSession();
        triggerSignal('focus', position, 16);
        showToast(`Destino fijado: ${name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      showToast('No se pudo obtener la ubicación de ese lugar');
    } finally {
      setIsResolvingPlace(false);
    }
  };

  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const detail = reportText.trim() || 'Demora reportada por pasajero cerca de Estación La Catorce.';
    onReportIncident(`${reportType} • Cra 46`, detail);
    setReportText('');
    setShowReportModal(false);
    showToast('Incidente enviado al Centro de Control BAQ');
  };

  return (
    <div className="@container relative w-full h-full max-w-[960px] mx-auto bg-white flex flex-col overflow-hidden border-x border-slate-200">
      {/* Top Floating Header & Location Status */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-3 bg-gradient-to-b from-slate-900/90 via-slate-900/55 to-transparent pointer-events-none">
        <div className="flex items-center justify-between mb-3 pointer-events-auto">
          {/* Brand & City Tag */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-[#0D9488] flex items-center justify-center text-white shadow-md shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-lg font-bold text-white tracking-tight">
                  APP BUSES
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[11px] font-semibold">
                  BAQ
                </span>
              </div>
              <p className="text-white/85 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                <span>GPS Activo • Cra 46 con Calle 74</span>
              </p>
            </div>
          </div>

          {/* Quick Wallet Pill & Notifications */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('billetera')}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur shadow-sm border border-white/40 text-slate-900 hover:bg-white active:scale-95 transition-all"
            >
              <Wallet className="w-4 h-4 text-[#0D9488]" />
              <span className="font-mono text-[13px] font-bold tabular-nums">
                {formatCOP(balance)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowNotifModal(true)}
              aria-label="Notificaciones"
              className="w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-slate-900 shadow-sm hover:bg-white active:scale-95 transition-all relative"
            >
              <Bell className="w-5 h-5" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] absolute top-2 right-2 border-2 border-white" />
            </button>
          </div>
        </div>

        {/* Searchbar Input with Places Autocomplete Dropdown */}
        <div ref={searchBoxRef} className="relative pointer-events-auto">
          <div className="relative flex items-center shadow-lg rounded-[10px]">
            <Search
              aria-hidden="true"
              className="w-4 h-4 absolute left-3.5 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-autocomplete="list"
              value={searchQuery}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
                if (!e.target.value.trim()) {
                  setSelectedDestination(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDropdownOpen(false);
                } else if (e.key === 'Enter' && dropdownOpen) {
                  e.preventDefault();
                  if (placeSuggestions.length > 0) {
                    void handleSelectPlaceSuggestion(placeSuggestions[0]);
                  } else if (matchingStations.length > 0) {
                    handleSelectStationSuggestion(matchingStations[0]);
                  } else if (matchingTopBarRoutes.length > 0) {
                    handleSelectCompanyRoute(matchingTopBarRoutes[0], true);
                  }
                }
              }}
              placeholder="¿A dónde vas? Lugar, dirección, empresa o ruta..."
              className="w-full min-h-[48px] pl-10 pr-20 py-3 bg-white border-0 rounded-[10px] text-sm text-slate-900 placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDestination(null);
                  resetSession();
                  setDropdownOpen(false);
                }}
                aria-label="Limpiar búsqueda"
                className="w-8 h-8 absolute right-11 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleMicSearch}
              aria-label="Usar micrófono"
              className="w-10 h-10 absolute right-1.5 flex items-center justify-center text-slate-500 hover:text-[#0D9488]"
            >
              {isResolvingPlace ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {dropdownOpen && searchQuery.trim().length >= 2 && (
            <div
              role="listbox"
              aria-label="Sugerencias de lugares y direcciones"
              className="absolute left-0 right-0 mt-1.5 bg-white rounded-[12px] shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-64 overflow-y-auto divide-y divide-slate-100"
            >
              {matchingStations.map((st) => (
                <button
                  key={`st-${st.id}`}
                  type="button"
                  onClick={() => handleSelectStationSuggestion(st)}
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

              {isSuggestionsLoading && (
                <div className="px-3.5 py-3 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                  <span>Buscando lugares y direcciones en Barranquilla...</span>
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

              {matchingTopBarRoutes.map((route) => (
                <button
                  key={`top-route-${route.id}`}
                  type="button"
                  onClick={() => handleSelectCompanyRoute(route, true)}
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-teal-50/70 transition-colors"
                >
                  <div
                    className={`w-7 h-7 rounded-md ${getCompanyBadgeClass(
                      route.company
                    )} text-white flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {route.code} · {route.company}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{route.description}</p>
                  </div>
                </button>
              ))}

              {!isSuggestionsLoading &&
                suggestionsError &&
                matchingStations.length === 0 &&
                matchingTopBarRoutes.length === 0 && (
                  <div className="px-3.5 py-3 text-xs text-amber-700 bg-amber-50">
                    {suggestionsError}
                  </div>
                )}

              {!isSuggestionsLoading &&
                !suggestionsError &&
                placeSuggestions.length === 0 &&
                matchingStations.length === 0 &&
                matchingTopBarRoutes.length === 0 && (
                  <div className="px-3.5 py-3 text-xs text-slate-500">
                    No se encontraron lugares, direcciones ni rutas para "{searchQuery}".
                  </div>
                )}
            </div>
          )}
        </div>
      </header>

      {/* Interactive Real Barranquilla Google Map Area */}
      <main className="relative flex-1 min-h-[210px] w-full bg-[#E8ECEF] overflow-hidden">
        <BarranquillaPassengerMap
          routeFilter={routeFilter}
          showTrafficLayer={showTrafficLayer}
          showCorridors={showCorridors}
          busT01Position={busT01Position}
          busA12Position={busA12Position}
          userPosition={USER_GPS_POSITION}
          selectedDestination={selectedDestination}
          selectedCompanyRoute={selectedCompanyRoute}
          signal={mapSignal}
          onCameraSync={handleCameraSync}
          onSelectStation={(st) => setSelectedStation(st)}
          onSelectBus={(code) => {
            if (code === 'T-01') {
              triggerSignal('focus', busT01Position, 16);
              showToast('Bus #B-304 (T-01) • Llega en 2 min • 42% Ocupación');
            } else {
              triggerSignal('focus', busA12Position, 16);
              showToast('Bus #B-118 (A-12) • Llega en 6 min • 18% Ocupación');
            }
          }}
        />

        {/* Quick Category Chips */}
        <div className="absolute left-3.5 top-32 z-20 flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[calc(100%-70px)]">
          <button
            type="button"
            onClick={() => {
              setRouteFilter('troncal');
              setSelectedCompany('all');
              setRouteSearchFilter('');
              showToast('Filtrando solo rutas Troncales');
            }}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-[11px] font-medium shadow flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all ${
              routeFilter === 'troncal'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-800 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Troncales
          </button>
          <button
            type="button"
            onClick={() => {
              setRouteFilter('alimentador');
              setSelectedCompany('all');
              setRouteSearchFilter('');
              showToast('Filtrando solo rutas Alimentadoras');
            }}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-[11px] font-medium shadow flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all ${
              routeFilter === 'alimentador'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-800 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Alimentadores
          </button>
          <button
            type="button"
            onClick={() => {
              setRouteFilter('all');
              setSheetExpanded(true);
              showToast('Mostrando las 24 empresas y 91 rutas de Barranquilla');
            }}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-[11px] font-medium shadow flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all ${
              routeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-800 border border-slate-200'
            }`}
          >
            Empresas y Rutas ({COMPANY_BUS_ROUTES.length})
          </button>
        </div>

        {/* Floating Map Utility Buttons */}
        <aside
          aria-label="Controles del mapa"
          className="absolute right-3.5 top-32 z-20 flex flex-col gap-1.5"
        >
          <button
            type="button"
            onClick={handleCenterGPS}
            aria-label="Mi ubicación"
            className="w-10 h-10 rounded-full bg-white text-slate-900 shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
          >
            <LocateFixed className="w-4 h-4 text-[#0D9488]" />
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

          {/* Real Google Maps Zoom Group */}
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
              disabled={zoomState.zoom <= 12}
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

      {/* Bottom Sliding Sheet: Nearby Routes & Bus Real-Time Telemetry */}
      <section
        aria-label="Rutas cercanas y estimaciones de llegada"
        className={`relative z-30 shrink-0 min-h-0 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-slate-200 px-4 pt-2.5 pb-[76px] flex flex-col gap-2 transition-all ${
          sheetExpanded ? 'max-h-[72%]' : 'max-h-[55%]'
        }`}
      >
        {/* Sheet Drag Handle */}
        <button
          type="button"
          onClick={() => setSheetExpanded((s) => !s)}
          aria-label="Expandir o contraer rutas"
          className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-0.5 hover:bg-slate-400 transition-colors"
        />

        {/* Live Station Indicator or Selected Destination Summary */}
        {selectedDestination && (
          <div className="px-3 py-2 rounded-[10px] bg-teal-50 border border-teal-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#0D9488] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  Destino: {selectedDestination.name}
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  {selectedDestination.address} · Ruta recomendada: T-01 / A-12
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDestination(null);
                setSearchQuery('');
                triggerSignal('reset');
              }}
              aria-label="Quitar destino"
              className="p-1 text-slate-500 hover:text-slate-900 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected Bus Company Route Banner */}
        {selectedCompanyRoute && (
          <div className="px-3 py-2 rounded-[10px] bg-slate-900 text-white flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-headline font-bold text-white shrink-0 ${getCompanyBadgeClass(
                  selectedCompanyRoute.company
                )}`}
              >
                {selectedCompanyRoute.code}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {selectedCompanyRoute.company} · {selectedCompanyRoute.corridor}
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  {selectedCompanyRoute.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCompanyRoute(null);
                triggerSignal('reset');
              }}
              aria-label="Quitar ruta seleccionada"
              className="p-1 text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
              Parada más cercana (85m)
            </span>
            <h2 className="font-headline text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Estación La Catorce</span>
              <CheckCircle2 className="w-4 h-4 text-teal-800" />
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStation(TRANSIT_STATIONS[0])}
            className="min-h-[44px] flex items-center gap-0.5 text-xs text-teal-800 font-bold hover:underline"
          >
            <span>Horarios</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bus Company & Route Search Filter Bar */}
        <div
          aria-label="Filtro de empresas y rutas de buses"
          className="grid grid-cols-1 @[480px]:grid-cols-12 gap-2 shrink-0"
        >
          <div className="@[480px]:col-span-5">
            <select
              aria-label="Filtrar por empresa de bus"
              value={selectedCompany}
              onChange={(e) => {
                const next = e.target.value;
                setSelectedCompany(next);
                setRouteFilter('all');
                if (next !== 'all') {
                  setSheetExpanded(true);
                }
              }}
              className="w-full min-h-[40px] px-3 py-2 rounded-[10px] bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="all">
                Todas las empresas ({BUS_COMPANIES.length} · {COMPANY_BUS_ROUTES.length} rutas)
              </option>
              {BUS_COMPANIES.map((comp) => (
                <option key={comp.name} value={comp.name}>
                  {comp.name} ({comp.count})
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
              aria-label="Buscar empresa, código de ruta o barrio"
              value={routeSearchFilter}
              onFocus={() => setSheetExpanded(true)}
              onChange={(e) => {
                setRouteSearchFilter(e.target.value);
                setRouteFilter('all');
                setSheetExpanded(true);
              }}
              placeholder="Buscar empresa, código o barrio (ej. Vía 40)..."
              className="w-full min-h-[40px] pl-8 pr-24 py-2 rounded-[10px] bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              {routeSearchFilter && (
                <button
                  type="button"
                  onClick={() => setRouteSearchFilter('')}
                  aria-label="Limpiar filtro de rutas"
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-700 tabular-nums">
                {filteredCompanyRoutes.length + filteredRoutes.length}
              </span>
            </div>
          </div>
        </div>

        {/* Bus Route Cards List */}
        <div className="flex-1 min-h-0 grid grid-cols-1 @[560px]:grid-cols-2 gap-3 overflow-y-auto pr-0.5 content-start">
          {filteredRoutes.length === 0 && filteredCompanyRoutes.length === 0 ? (
            <div className="col-span-full py-6 text-center text-sm text-slate-500 space-y-2">
              <p>
                No se encontraron rutas para{' '}
                {selectedCompany !== 'all' ? `${selectedCompany} ` : ''}
                {routeSearchFilter ? `"${routeSearchFilter}"` : `"${searchQuery}"`}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCompany('all');
                  setRouteSearchFilter('');
                  setRouteFilter('all');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <>
              {filteredRoutes.map((route) => {
                const isTroncal = route.category === 'troncal';
                const badgeColor = isTroncal ? 'bg-[#2563EB]' : 'bg-[#16A34A]';
                const isMedOcc = route.occupancyPct >= 40;
                return (
                  <article
                    key={route.id}
                    onClick={() => {
                      triggerSignal(
                        'focus',
                        isTroncal ? busT01Position : busA12Position,
                        16
                      );
                      showToast(`Siguiendo ${route.code} (${route.busId})`);
                    }}
                    className="p-3.5 bg-slate-50 rounded-[14px] border border-slate-200 hover:border-[#0D9488] transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-1 ${badgeColor} text-white font-headline text-base font-bold rounded-[6px]`}
                        >
                          {route.code}
                        </span>
                        <div>
                          <h3 className="text-sm text-slate-900 font-semibold leading-snug">
                            {route.name}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <span>{route.busId}</span> •{' '}
                            <span className="text-slate-600 font-mono">
                              {route.amenities ?? route.corridor}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-headline text-base text-emerald-700 font-bold tabular-nums">
                          {route.etaMinutes} min
                        </span>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          Próx: {route.nextMinutes} min
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border ${
                          isMedOcc
                            ? 'bg-amber-50 text-[#D97706] border-amber-200'
                            : 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isMedOcc ? 'bg-[#D97706]' : 'bg-[#16A34A]'
                          }`}
                        />
                        <span>{route.occupancyPct}% Ocupación</span>
                      </span>

                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[13px] font-bold text-slate-900 tabular-nums">
                          {formatCOP(route.fareCop)} COP
                        </span>
                        {isTroncal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('billetera');
                            }}
                            className="min-h-9 px-3 py-1.5 rounded bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800 active:scale-95 transition-all"
                          >
                            QR Pasaje
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredCompanyRoutes.map((route) => {
                const isSelected = selectedCompanyRoute?.id === route.id;
                return (
                  <article
                    key={route.id}
                    onClick={() => handleSelectCompanyRoute(route, false)}
                    className={`p-3.5 rounded-[14px] border transition-all cursor-pointer ${
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
                        <span className="font-headline text-sm text-emerald-700 font-bold tabular-nums">
                          {route.etaMinutes} min
                        </span>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          Próx: {route.nextMinutes} min
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Mostrando en mapa' : 'Ver recorrido'}</span>
                      </span>

                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[13px] font-bold text-slate-900 tabular-nums">
                          {formatCOP(route.fareCop)} COP
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('billetera');
                          }}
                          className="min-h-8 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800 active:scale-95 transition-all"
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

      {/* Persistent Bottom Navigation Bar */}
      <nav
        aria-label="Navegación principal de la aplicación"
        className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 pt-2 pb-4 md:pb-3 shadow-lg"
      >
        <ul className="flex items-center justify-around max-w-lg mx-auto">
          <li>
            <button
              type="button"
              onClick={() => triggerSignal('reset')}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[#0D9488] font-medium px-3"
              aria-current="page"
            >
              <Compass className="w-5 h-5" />
              <span className="text-[11px]">Explorar</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setSheetExpanded(true);
                setRouteFilter('all');
                showToast('Mostrando todas las rutas de Barranquilla');
              }}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-3"
            >
              <Route className="w-5 h-5" />
              <span className="text-[11px]">Rutas</span>
            </button>
          </li>
          <li className="-mt-5">
            <button
              type="button"
              onClick={() => onNavigate('billetera')}
              aria-label="Generar Ticket QR"
              className="w-14 h-14 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              <QrCode className="w-7 h-7" />
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onNavigate('billetera')}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-3"
            >
              <Wallet className="w-5 h-5" />
              <span className="text-[11px]">Billetera</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setShowRolesModal(true)}
              aria-label="Cambiar Rol de Usuario"
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-3"
            >
              <Users className="w-5 h-5" />
              <span className="text-[11px]">Roles</span>
            </button>
          </li>
        </ul>
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
                      Mapa, Rutas en vivo y Billetera Digital
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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 max-w-[90%] whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
