import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {
  ArrowRight,
  ArrowUpDown,
  Bus,
  ChevronDown,
  Loader2,
  LocateFixed,
  MapPin,
  Mic,
  Monitor,
  Plus,
  QrCode,
  Route,
  Search,
  Store,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  BARRANQUILLA_PASSENGER_CENTER,
  TRANSIT_STATIONS,
  USER_GPS_POSITION,
  formatCOP,
  getDistanceMeters,
} from '../data/barranquillaTransit';
import {
  resolvePlaceFromText,
  resolveSuggestionToPlace,
  useAutocompleteSuggestions,
  type PlaceSuggestionItem,
} from '../hooks/useAutocompleteSuggestions';
import type {LatLng, PlacePoint, ScreenId, TripPlannerState} from '../types/transit';
import {PWAInstallButton} from './PWAInstallButton';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface PassengerBottomNavProps {
  currentScreen: 'rutas' | 'billetera' | 'qr';
  balance: number;
  tripPlanner: TripPlannerState;
  onNavigate: (screen: ScreenId) => void;
  onDestinationCleared?: () => void;
  externalOpenNonce?: number;
  routesSearchOpen?: boolean;
  onToggleRoutesSearch?: () => void;
  onCloseRoutesSearch?: () => void;
  positionClass?: string;
}

export function PassengerBottomNav({
  currentScreen,
  balance,
  tripPlanner,
  onNavigate,
  onDestinationCleared,
  externalOpenNonce = 0,
  routesSearchOpen = false,
  onToggleRoutesSearch,
  onCloseRoutesSearch,
  positionClass = 'relative shrink-0',
}: PassengerBottomNavProps) {
  const placesLib = useMapsLibrary('places');
  const searchCardRef = useRef<HTMLDivElement | null>(null);
  const destInputRef = useRef<HTMLInputElement | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  const tripsCount = Math.floor(balance / 3100);

  const {
    originQuery,
    originMarker,
    destQuery,
    selectedDestination,
    userPosition,
    reopenTripNonce,
    setOriginQuery,
    setOriginMarker,
    setDestQuery,
    setSelectedDestination,
    setMapPickTarget,
    onUpdateUserPosition,
    onFocusMap,
    onTripSubmitted,
    onOpenVoiceTrip,
    onToast,
  } = tripPlanner;

  useEffect(() => {
    if (externalOpenNonce > 0) {
      setSearchOpen(true);
      setActiveField('destination');
      window.setTimeout(() => destInputRef.current?.focus(), 60);
    }
  }, [externalOpenNonce]);

  useEffect(() => {
    if (reopenTripNonce > 0) {
      setSearchOpen(true);
      setActiveField(null);
    }
  }, [reopenTripNonce]);

  const handleStartMapPick = useCallback(
    (target: 'origin' | 'destination') => {
      setSearchOpen(false);
      setActiveField(null);
      setMapPickTarget(target);
      if (currentScreen !== 'rutas') {
        onNavigate('rutas');
      }
      onToast(
        target === 'origin'
          ? 'Toca el mapa o arrastra el pin para elegir recogida'
          : 'Toca el mapa o arrastra el pin para elegir destino'
      );
    },
    [currentScreen, onNavigate, onToast, setMapPickTarget]
  );

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
  } = useAutocompleteSuggestions(
    autocompleteQuery,
    searchOpen && activeField !== null,
    originMarker?.position ?? userPosition
  );

  const matchingStations = useMemo(() => {
    const q = normalizeText(autocompleteQuery.trim());
    if (q.length < 2) return [];
    return TRANSIT_STATIONS.filter(
      (st) => normalizeText(st.name).includes(q) || normalizeText(st.subtitle).includes(q)
    );
  }, [autocompleteQuery]);

  const handleLocateUser = useCallback(() => {
    setOriginMarker(null);
    setOriginQuery('Mi ubicación actual (GPS)');
    setActiveField(null);

    if (!navigator.geolocation) {
      onUpdateUserPosition(USER_GPS_POSITION);
      onFocusMap(USER_GPS_POSITION, 16);
      onToast('Ubicación fijada en Cra 46 con Calle 74 (Barranquilla)');
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
          onFocusMap(realPos, 16);
          onToast('Tu ubicación GPS en Barranquilla ha sido actualizada');
        } else {
          onUpdateUserPosition(USER_GPS_POSITION);
          onFocusMap(USER_GPS_POSITION, 16);
          onToast('GPS ubicado en Barranquilla (Cra 46 con Calle 74) para ver buses locales');
        }
      },
      () => {
        setIsLocatingUser(false);
        onUpdateUserPosition(USER_GPS_POSITION);
        onFocusMap(USER_GPS_POSITION, 16);
        onToast('Centrado en tu ubicación de Barranquilla (Cra 46 con Cll 74)');
      },
      {enableHighAccuracy: true, timeout: 6000}
    );
  }, [onFocusMap, onToast, onUpdateUserPosition, setOriginMarker, setOriginQuery]);

  const applyPlacePoint = useCallback(
    (point: PlacePoint, targetField: 'origin' | 'destination') => {
      if (targetField === 'origin') {
        setOriginMarker(point);
        setOriginQuery(point.name);
        onFocusMap(point.position, 15);
        onToast(`Punto de recogida: ${point.name}`);
      } else {
        setSelectedDestination(point);
        setDestQuery(point.name);
        onFocusMap(point.position, 15);
        onToast(`Destino: ${point.name}`);
      }
      setActiveField(null);
      resetSession();
    },
    [
      onFocusMap,
      onToast,
      resetSession,
      setDestQuery,
      setOriginMarker,
      setOriginQuery,
      setSelectedDestination,
    ]
  );

  const handleSelectPlaceSuggestion = async (suggestion: PlaceSuggestionItem) => {
    if (!activeField) return;
    const targetField = activeField;
    setIsResolvingPlace(true);
    try {
      const resolved = await resolveSuggestionToPlace(placesLib ?? null, suggestion);
      if (resolved) {
        applyPlacePoint(resolved, targetField);
      } else {
        onToast('No se pudo obtener la ubicación de ese lugar');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      onToast('No se pudo obtener la ubicación de ese lugar');
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
    onToast('Lugar de recogida y destino intercambiados');
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setActiveField(null);
  };

  const resolveTextToPlace = useCallback(
    async (queryText: string): Promise<PlacePoint | null> => {
      const q = normalizeText(queryText.trim());
      if (q.length < 2) return null;

      const stationMatch = TRANSIT_STATIONS.find(
        (st) => normalizeText(st.name).includes(q) || normalizeText(st.subtitle).includes(q)
      );
      if (stationMatch) {
        return {
          name: stationMatch.name,
          address: stationMatch.subtitle,
          position: stationMatch.position,
        };
      }

      return resolvePlaceFromText(placesLib ?? null, queryText, userPosition);
    },
    [placesLib, userPosition]
  );

  const handleSearchSubmit = async () => {
    if (isResolvingPlace) return;

    const trimmedOrigin = originQuery.trim();
    const trimmedDest = destQuery.trim();

    if (!trimmedDest && !selectedDestination) {
      onToast('Ingresa o elige tu destino en Barranquilla para buscar rutas');
      setActiveField('destination');
      destInputRef.current?.focus();
      return;
    }

    let resolvedOrigin = originMarker;
    let resolvedDest = selectedDestination;

    const needsOriginResolve =
      !resolvedOrigin &&
      trimmedOrigin.length >= 2 &&
      trimmedOrigin !== 'Mi ubicación actual (GPS)';
    const needsDestResolve = !resolvedDest && trimmedDest.length >= 2;

    if (needsOriginResolve || needsDestResolve) {
      setIsResolvingPlace(true);
      try {
        if (needsOriginResolve) {
          const pt = await resolveTextToPlace(trimmedOrigin);
          if (pt) {
            resolvedOrigin = pt;
            setOriginMarker(pt);
            setOriginQuery(pt.name);
          }
        }
        if (needsDestResolve) {
          const pt = await resolveTextToPlace(trimmedDest);
          if (pt) {
            resolvedDest = pt;
            setSelectedDestination(pt);
            setDestQuery(pt.name);
          }
        }
      } finally {
        setIsResolvingPlace(false);
      }
    }

    if (needsOriginResolve && !resolvedOrigin) {
      onToast('No se encontró ese punto de partida. Elige una sugerencia o pin en el mapa.');
      setActiveField('origin');
      return;
    }

    if (needsDestResolve && !resolvedDest) {
      onToast('No se encontró ese destino en Barranquilla. Elige una sugerencia o pin.');
      setActiveField('destination');
      destInputRef.current?.focus();
      return;
    }

    if (!resolvedDest) {
      onToast('Selecciona un destino válido para calcular las rutas');
      setActiveField('destination');
      destInputRef.current?.focus();
      return;
    }

    const focusTarget = resolvedDest.position;
    onFocusMap(focusTarget, 15);
    onTripSubmitted();
    resetSession();
    closeSearch();

    if (currentScreen !== 'rutas') {
      onNavigate('rutas');
    }

    const originLabel = resolvedOrigin?.name ?? 'tu ubicación';
    onToast(`Buscando rutas de ${originLabel} a ${resolvedDest.name}`);
  };

  const showDropdown =
    searchOpen &&
    activeField !== null &&
    (activeField === 'origin' || autocompleteQuery.trim().length >= 2);

  return (
    <>
      {searchOpen && (
        <div
          aria-hidden="true"
          onClick={closeSearch}
          className="absolute inset-0 z-30 bg-slate-900/25 backdrop-blur-[1px]"
        />
      )}

      {/* Bottom App Shell Navigation Bar */}
      <nav
        aria-label="Navegación principal"
        className={`${positionClass} z-40 bg-white border-t border-slate-200 px-3 pt-1.5 pb-2.5 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]`}
      >
        <div className="max-w-3xl mx-auto relative">
          {/* Pickup & Destination Search Overlay anchored above the Bottom Bar */}
          {searchOpen && (
            <div
              ref={searchCardRef}
              className="absolute left-0 right-0 bottom-full mb-3 z-50 max-w-lg mx-auto"
            >
            {/* Places Autocomplete Dropdown opening upward above the search card */}
            {showDropdown && (
              <div
                role="listbox"
                aria-label="Sugerencias de lugares"
                className="mb-1.5 bg-white rounded-[12px] shadow-2xl border border-slate-200 overflow-hidden max-h-[38vh] overflow-y-auto divide-y divide-slate-100"
              >
                {activeField && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleStartMapPick(activeField)}
                    className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 bg-slate-50 hover:bg-teal-50/70 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <span className="text-xs font-semibold text-slate-900">
                      Seleccionar {activeField === 'origin' ? 'recogida' : 'destino'} con pin en el mapa
                    </span>
                  </button>
                )}

                {activeField === 'origin' && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
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
                    onMouseDown={(e) => e.preventDefault()}
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
                  <div className="px-3.5 py-2 flex items-center gap-2 text-xs text-slate-500 bg-slate-50/70">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                    <span>Buscando lugares en Barranquilla...</span>
                  </div>
                )}

                {placeSuggestions.map((suggestion, idx) => (
                  <button
                    key={suggestion.placeId || `place-${idx}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handleSelectPlaceSuggestion(suggestion)}
                    className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {suggestion.mainText}
                      </p>
                      {suggestion.secondaryText && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {suggestion.secondaryText}
                        </p>
                      )}
                    </div>
                  </button>
                ))}

                {!isSuggestionsLoading &&
                  !isResolvingPlace &&
                  placeSuggestions.length === 0 &&
                  matchingStations.length === 0 &&
                  autocompleteQuery.trim().length >= 2 && (
                    <div
                      className={`px-3.5 py-3 text-xs ${
                        suggestionsError
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-slate-500 bg-white'
                      }`}
                    >
                      {suggestionsError ??
                        'Sin coincidencias exactas. Pulsa "Buscar ruta" para búsqueda amplia.'}
                    </div>
                  )}
              </div>
            )}

            {/* Highlighted Pickup & Destination Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-[14px] shadow-2xl border border-slate-200 p-2 space-y-1.5">
              {/* Row 1: Lugar de recogida */}
              <div className="flex items-center gap-1">
                <div className="relative flex-1 flex items-center">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-200 absolute left-2.5 z-10 pointer-events-none"
                  />
                  <input
                    type="text"
                    aria-label="Lugar de recogida"
                    value={originQuery}
                    onFocus={() => {
                      setActiveField('origin');
                      if (originQuery === 'Mi ubicación actual (GPS)') {
                        setOriginQuery('');
                      }
                    }}
                    onBlur={() => {
                      if (!originQuery.trim() && !originMarker) {
                        setOriginQuery('Mi ubicación actual (GPS)');
                      }
                    }}
                    onChange={(e) => {
                      setOriginQuery(e.target.value);
                      setActiveField('origin');
                      setOriginMarker(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSearchSubmit();
                      }
                    }}
                    placeholder="Lugar de recogida (ej. Cra 46, Prado...)"
                    className="w-full h-9 pl-7 pr-14 py-0 leading-normal rounded-[8px] bg-slate-100/90 text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
                  />
                  <div className="absolute right-1 flex items-center gap-0.5">
                    {originQuery && originQuery !== 'Mi ubicación actual (GPS)' && (
                      <button
                        type="button"
                        onClick={() => {
                          setOriginMarker(null);
                          setOriginQuery('Mi ubicación actual (GPS)');
                        }}
                        aria-label="Restablecer lugar de recogida a GPS"
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLocateUser}
                      title="Usar mi ubicación GPS actual"
                      aria-label="Usar mi ubicación GPS actual"
                      className="w-6 h-6 rounded bg-white border border-slate-200 text-[#0D9488] hover:bg-teal-50 flex items-center justify-center"
                    >
                      {isLocatingUser ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LocateFixed className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSwapOriginDestination}
                  aria-label="Intercambiar recogida y destino"
                  title="Intercambiar recogida y destino"
                  className="w-9 h-9 rounded-[8px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 2: Destino */}
              <div className="flex items-center gap-1">
                <div className="relative flex-1 flex items-center">
                  <MapPin
                    aria-hidden="true"
                    className="w-3.5 h-3.5 text-[#0D9488] absolute left-2 z-10 pointer-events-none"
                  />
                  <input
                    ref={destInputRef}
                    type="text"
                    aria-label="Destino"
                    value={destQuery}
                    onFocus={() => setActiveField('destination')}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setActiveField('destination');
                      setSelectedDestination(null);
                      onDestinationCleared?.();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSearchSubmit();
                      }
                    }}
                    placeholder="¿Cuál es tu destino en Barranquilla?"
                    className="w-full h-9 pl-7 pr-7 py-0 leading-normal rounded-[8px] bg-slate-100/90 text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
                  />
                  {destQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestQuery('');
                        setSelectedDestination(null);
                        onDestinationCleared?.();
                      }}
                      aria-label="Limpiar destino"
                      className="p-1 absolute right-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Minimizar barra de búsqueda"
                  title="Minimizar"
                  className="w-9 h-9 rounded-[8px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Select Pin on Map & Voice Dictation Options */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStartMapPick(activeField ?? 'destination')}
                  className="flex-1 h-8 px-2.5 rounded-[8px] bg-teal-50/90 hover:bg-teal-100 text-[#0D9488] border border-teal-200/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {activeField === 'origin'
                      ? 'Recogida con pin'
                      : 'Pin en el mapa'}
                  </span>
                </button>
                {onOpenVoiceTrip && (
                  <button
                    type="button"
                    onClick={() => {
                      closeSearch();
                      onOpenVoiceTrip();
                    }}
                    className="h-8 px-2.5 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Mic className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Dictar</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isResolvingPlace}
                onClick={() => void handleSearchSubmit()}
                className="w-full h-9 rounded-[8px] bg-[#0D9488] hover:bg-teal-700 disabled:opacity-70 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                {isResolvingPlace ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Buscando ruta...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar ruta</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <ul className="flex items-center justify-between max-w-2xl mx-auto gap-0.5 sm:gap-4">
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                closeSearch();
                if (currentScreen !== 'rutas') {
                  onNavigate('rutas');
                } else {
                  onToggleRoutesSearch?.();
                }
              }}
              aria-current={currentScreen === 'rutas' ? 'page' : undefined}
              aria-expanded={
                currentScreen === 'rutas' && onToggleRoutesSearch ? routesSearchOpen : undefined
              }
              aria-label={
                currentScreen === 'rutas'
                  ? routesSearchOpen
                    ? 'Cerrar menú lateral de filtro de rutas'
                    : 'Abrir menú lateral de filtro de rutas'
                  : 'Ir a Rutas'
              }
              className={`min-h-[48px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 rounded-xl transition-colors ${
                currentScreen === 'rutas'
                  ? routesSearchOpen
                    ? 'bg-teal-50 text-[#0D9488] font-semibold'
                    : 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Route className="w-5 h-5" />
              <span className="text-[11px] sm:text-xs whitespace-nowrap">Rutas</span>
            </button>
          </li>
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                onCloseRoutesSearch?.();
                setSearchOpen((open) => {
                  const next = !open;
                  if (next) {
                    setActiveField('destination');
                    window.setTimeout(() => destInputRef.current?.focus(), 60);
                  } else {
                    setActiveField(null);
                  }
                  return next;
                });
              }}
              aria-expanded={searchOpen}
              aria-label={
                searchOpen
                  ? 'Cerrar búsqueda de recogida y destino'
                  : 'Planificar viaje: lugar de recogida y destino'
              }
              className={`min-h-[48px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 rounded-xl transition-colors cursor-pointer ${
                searchOpen
                  ? 'bg-teal-50 text-[#0D9488] font-semibold'
                  : originMarker || selectedDestination
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Plus
                className={`w-5 h-5 transition-transform duration-200 ${
                  searchOpen ? 'rotate-45' : ''
                }`}
              />
              <span className="text-[11px] sm:text-xs whitespace-nowrap">Viaje</span>
            </button>
          </li>
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                closeSearch();
                if (currentScreen !== 'qr') onNavigate('qr');
              }}
              aria-current={currentScreen === 'qr' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 rounded-xl transition-colors ${
                currentScreen === 'qr'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span className="text-[11px] sm:text-xs whitespace-nowrap">Ticket QR</span>
            </button>
          </li>
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                closeSearch();
                if (currentScreen !== 'billetera') onNavigate('billetera');
              }}
              aria-current={currentScreen === 'billetera' ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 rounded-xl transition-colors ${
                currentScreen === 'billetera'
                  ? 'text-[#0D9488] font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-[11px] sm:text-xs whitespace-nowrap">Billetera</span>
            </button>
          </li>
          <li className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                closeSearch();
                setShowProfileModal(true);
              }}
              className="min-h-[48px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-slate-500 hover:text-slate-900 px-1.5 sm:px-3 rounded-xl"
            >
              <User className="w-5 h-5" />
              <span className="text-[11px] sm:text-xs whitespace-nowrap">Perfil</span>
            </button>
          </li>
        </ul>
        </div>
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
                  if (currentScreen !== 'rutas') onNavigate('rutas');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Route className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Mapa y Rutas BAQ</p>
                    <p className="text-[11px] text-slate-500">
                      Buses en vivo, recogida, destino y rutas
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  if (currentScreen !== 'qr') onNavigate('qr');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Ticket QR de Abordaje</p>
                    <p className="text-[11px] text-slate-500">
                      Código QR dinámico, NFC y pasajes grupales
                    </p>
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

              <PWAInstallButton
                variant="card"
                showFallbackHint
                onAfterAction={() => setShowProfileModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
