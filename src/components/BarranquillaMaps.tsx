/// <reference types="google.maps" />
import React, {useEffect, useRef, useState} from 'react';
import {
  APILoadingStatus,
  AdvancedMarker,
  Map as GoogleMap,
  useApiIsLoaded,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {AlertTriangle, Bus, MapPin, Navigation, Store} from 'lucide-react';
import {
  BARRANQUILLA_FLEET_CENTER,
  BARRANQUILLA_PASSENGER_CENTER,
  CORRIDOR_POLYLINES,
  TRANSIT_STATIONS,
  USER_GPS_POSITION,
} from '../data/barranquillaTransit';
import type {CompanyRouteItem} from '../data/busRoutesCatalog';
import type {FleetBus, LatLng, MapBounds, RouteFilter, TransitStation} from '../types/transit';

const ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
const DEMO_MAP_ID = 'DEMO_MAP_ID';

export interface NearbyBusMarker {
  id: string;
  code: string;
  company: string;
  position: LatLng;
  etaMinutes: number;
  distanceMeters: number;
  color: string;
}

interface CorridorOverlayProps {
  visible: boolean;
  routeFilter: RouteFilter;
  showTraffic?: boolean;
}

function TransitCorridorsOverlay({visible, routeFilter, showTraffic}: CorridorOverlayProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !visible) return;

    const polylines: google.maps.Polyline[] = [];
    for (const corridor of CORRIDOR_POLYLINES) {
      if (routeFilter === 'troncal' && corridor.id === 'alimentador-a12') continue;
      if (routeFilter === 'alimentador' && corridor.id === 'troncal-cra-46') continue;

      const poly = new mapsLib.Polyline({
        path: corridor.path,
        strokeColor: corridor.color,
        strokeOpacity: corridor.opacity,
        strokeWeight: corridor.weight,
        geodesic: true,
        map,
      });
      polylines.push(poly);
    }

    return () => {
      for (const poly of polylines) {
        poly.setMap(null);
      }
    };
  }, [map, mapsLib, visible, routeFilter]);

  useEffect(() => {
    if (!map || !mapsLib || !showTraffic) return;
    const trafficLayer = new mapsLib.TrafficLayer();
    trafficLayer.setMap(map);
    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, mapsLib, showTraffic]);

  return null;
}

function SelectedRouteOverlay({route}: {route: CompanyRouteItem | null | undefined}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !route || route.path.length < 2) return;

    const casing = new mapsLib.Polyline({
      path: route.path,
      strokeColor: '#FFFFFF',
      strokeOpacity: 0.92,
      strokeWeight: 9,
      geodesic: true,
      zIndex: 38,
      map,
    });

    const line = new mapsLib.Polyline({
      path: route.path,
      strokeColor: route.color,
      strokeOpacity: 0.96,
      strokeWeight: 6,
      geodesic: true,
      zIndex: 40,
      map,
    });

    return () => {
      line.setMap(null);
      casing.setMap(null);
    };
  }, [map, mapsLib, route]);

  return null;
}

function RadiusCircleOverlay({
  center,
  radiusMeters,
}: {
  center: LatLng;
  radiusMeters: number | null | undefined;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !radiusMeters || radiusMeters <= 0) return;

    const circle = new mapsLib.Circle({
      center,
      radius: radiusMeters,
      strokeColor: '#0D9488',
      strokeOpacity: 0.55,
      strokeWeight: 1.5,
      fillColor: '#14B8A6',
      fillOpacity: 0.08,
      clickable: false,
      zIndex: 5,
      map,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, mapsLib, center, radiusMeters]);

  return null;
}

function TripConnectionOverlay({
  origin,
  destination,
}: {
  origin: LatLng;
  destination: LatLng | null | undefined;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !destination) return;

    const line = new mapsLib.Polyline({
      path: [origin, destination],
      strokeColor: '#0F172A',
      strokeOpacity: 0,
      strokeWeight: 3,
      geodesic: true,
      zIndex: 32,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.85,
            strokeColor: '#0D9488',
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
      map,
    });

    return () => {
      line.setMap(null);
    };
  }, [map, mapsLib, origin, destination]);

  return null;
}

export interface MapControlSignal {
  type: 'zoomIn' | 'zoomOut' | 'reset' | 'centerUser' | 'focus';
  target?: LatLng;
  zoom?: number;
  nonce: number;
}

function CameraController({
  signal,
  defaultCenter,
  defaultZoom,
  onCameraSync,
}: {
  signal: MapControlSignal | null;
  defaultCenter: LatLng;
  defaultZoom: number;
  onCameraSync?: (zoom: number, isAtDefault: boolean) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !onCameraSync) return;
    const updateSync = () => {
      const z = map.getZoom() ?? defaultZoom;
      const c = map.getCenter();
      const same =
        z === defaultZoom &&
        c != null &&
        Math.abs(c.lat() - defaultCenter.lat) < 1e-4 &&
        Math.abs(c.lng() - defaultCenter.lng) < 1e-4;
      onCameraSync(z, same);
    };
    updateSync();
    const l1 = map.addListener('zoom_changed', updateSync);
    const l2 = map.addListener('idle', updateSync);
    return () => {
      l1.remove();
      l2.remove();
    };
  }, [map, defaultCenter, defaultZoom, onCameraSync]);

  useEffect(() => {
    if (!map || !signal) return;
    const currentZoom = map.getZoom() ?? defaultZoom;
    if (signal.type === 'zoomIn') {
      map.setZoom(Math.min(19, currentZoom + 1));
    } else if (signal.type === 'zoomOut') {
      map.setZoom(Math.max(11, currentZoom - 1));
    } else if (signal.type === 'reset') {
      map.panTo(defaultCenter);
      map.setZoom(defaultZoom);
    } else if (signal.type === 'centerUser') {
      map.panTo(signal.target ?? USER_GPS_POSITION);
      map.setZoom(signal.zoom ?? 16);
    } else if (signal.type === 'focus' && signal.target) {
      map.panTo(signal.target);
      if (signal.zoom) map.setZoom(signal.zoom);
    }
  }, [map, signal, defaultCenter, defaultZoom]);

  return null;
}

function MapStatusOverlay({theme = 'light'}: {theme?: 'light' | 'dark'}) {
  const isLoaded = useApiIsLoaded();
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center ${
          theme === 'dark' ? 'bg-slate-900/95 text-slate-200' : 'bg-slate-100/95 text-slate-800'
        }`}
      >
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="font-headline text-sm font-bold">Mapa de Barranquilla no disponible</p>
        <p className="text-xs opacity-80 max-w-xs mt-1">
          No se pudo cargar Google Maps Platform. Verifica la clave o la conexión de red.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center ${
          theme === 'dark' ? 'bg-slate-900/80 text-slate-300' : 'bg-slate-200/80 text-slate-700'
        }`}
      >
        <span className="text-xs font-mono font-medium">Cargando mapa de Barranquilla...</span>
      </div>
    );
  }

  return null;
}

interface BarranquillaPassengerMapProps {
  routeFilter: RouteFilter;
  showTrafficLayer: boolean;
  showCorridors: boolean;
  busT01Position: LatLng;
  busA12Position: LatLng;
  userPosition: LatLng;
  originMarker?: {
    name: string;
    address: string;
    position: LatLng;
  } | null;
  selectedDestination?: {
    name: string;
    address: string;
    position: LatLng;
  } | null;
  selectedCompanyRoute?: CompanyRouteItem | null;
  userRadiusMeters?: number | null;
  nearbyBuses?: NearbyBusMarker[];
  signal: MapControlSignal | null;
  onCameraSync: (zoom: number, isAtDefault: boolean) => void;
  onSelectStation: (station: TransitStation) => void;
  onSelectBus: (routeCode: string) => void;
  onSelectNearbyBus?: (bus: NearbyBusMarker) => void;
}

export function BarranquillaPassengerMap({
  routeFilter,
  showTrafficLayer,
  showCorridors,
  busT01Position,
  busA12Position,
  userPosition,
  originMarker,
  selectedDestination,
  selectedCompanyRoute,
  userRadiusMeters,
  nearbyBuses = [],
  signal,
  onCameraSync,
  onSelectStation,
  onSelectBus,
  onSelectNearbyBus,
}: BarranquillaPassengerMapProps) {
  const isDraggingRef = useRef(false);

  const showT01 = routeFilter === 'all' || routeFilter === 'troncal';
  const showA12 = routeFilter === 'all' || routeFilter === 'alimentador';
  const activeOrigin = originMarker?.position ?? userPosition;

  return (
    <div className="absolute inset-0 w-full h-full">
      <MapStatusOverlay theme="light" />
      <GoogleMap
        id="baq-passenger-map"
        mapId={DEMO_MAP_ID}
        defaultCenter={BARRANQUILLA_PASSENGER_CENTER}
        defaultZoom={15}
        minZoom={11}
        maxZoom={19}
        gestureHandling="greedy"
        disableDefaultUI={true}
        internalUsageAttributionIds={ATTRIBUTION_IDS}
        onDragstart={() => {
          isDraggingRef.current = true;
        }}
        onIdle={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 80);
        }}
        style={{width: '100%', height: '100%'}}
      >
        <CameraController
          signal={signal}
          defaultCenter={BARRANQUILLA_PASSENGER_CENTER}
          defaultZoom={15}
          onCameraSync={onCameraSync}
        />
        <TransitCorridorsOverlay
          visible={showCorridors}
          routeFilter={routeFilter}
          showTraffic={showTrafficLayer}
        />
        <RadiusCircleOverlay center={activeOrigin} radiusMeters={userRadiusMeters} />
        <TripConnectionOverlay origin={activeOrigin} destination={selectedDestination?.position} />
        <SelectedRouteOverlay route={selectedCompanyRoute} />

        {/* Stations: La Catorce, Esthercita Forero, Portal del Prado */}
        {TRANSIT_STATIONS.map((station) => (
          <AdvancedMarker
            key={station.id}
            position={station.position}
            zIndex={10}
            onClick={() => {
              if (!isDraggingRef.current) onSelectStation(station);
            }}
            title={station.name}
          >
            <button
              type="button"
              className="flex flex-col items-center group cursor-pointer focus:outline-none"
            >
              {station.isPrimary ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-[#2563EB]/40 group-hover:scale-110 transition-transform">
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="mt-1 px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-semibold shadow whitespace-nowrap">
                    Est. La Catorce
                  </span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow border-2 border-[#2563EB] group-hover:scale-110 transition-transform">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-white text-slate-800 text-[10px] font-medium border border-slate-200 shadow-sm whitespace-nowrap">
                    {station.name}
                  </span>
                </>
              )}
            </button>
          </AdvancedMarker>
        ))}

        {/* Live Bus T-01 */}
        {showT01 && (
          <AdvancedMarker
            position={busT01Position}
            zIndex={60}
            onClick={() => {
              if (!isDraggingRef.current) onSelectBus('T-01');
            }}
            title="Bus #B-304 · Troncal T-01"
          >
            <button
              type="button"
              className="flex items-center gap-1.5 cursor-pointer group focus:outline-none"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-xl border-2 border-white group-hover:scale-110 transition-transform">
                  <Bus className="w-4 h-4" />
                </div>
                <span className="absolute -inset-1 rounded-full bg-[#2563EB]/35 animate-ping pointer-events-none" />
              </div>
              <div className="px-2 py-0.5 rounded-md bg-slate-900 shadow-lg border border-slate-700 flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline text-[11px] font-bold text-white">T-01</span>
                  <span className="w-2 h-2 rounded-full bg-[#D97706]" title="42% Ocupación" />
                </div>
                <span className="font-mono text-[10px] font-semibold text-emerald-400">2 min</span>
              </div>
            </button>
          </AdvancedMarker>
        )}

        {/* Live Bus A-12 */}
        {showA12 && (
          <AdvancedMarker
            position={busA12Position}
            zIndex={50}
            onClick={() => {
              if (!isDraggingRef.current) onSelectBus('A-12');
            }}
            title="Bus #B-118 · Alimentador A-12"
          >
            <button
              type="button"
              className="flex items-center gap-1.5 cursor-pointer group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                <Bus className="w-4 h-4" />
              </div>
              <div className="px-2 py-0.5 rounded bg-slate-900 shadow border border-slate-700 flex items-center gap-1.5">
                <span className="font-headline text-[11px] font-bold text-emerald-400">A-12</span>
                <span className="font-mono text-[10px] text-slate-300">6 min</span>
              </div>
            </button>
          </AdvancedMarker>
        )}

        {/* Dynamic Live Nearby Company Buses */}
        {nearbyBuses.map((bus) => (
          <AdvancedMarker
            key={bus.id}
            position={bus.position}
            zIndex={55}
            onClick={() => {
              if (!isDraggingRef.current) onSelectNearbyBus?.(bus);
            }}
            title={`${bus.company} · Ruta ${bus.code} (${bus.etaMinutes} min)`}
          >
            <button
              type="button"
              className="flex items-center gap-1 group cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-teal-300 flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                <Bus className="w-3.5 h-3.5" />
              </div>
              <div className="px-1.5 py-0.5 rounded bg-white/95 text-slate-900 shadow border border-slate-200 text-left leading-tight">
                <p className="font-headline text-[10px] font-bold whitespace-nowrap">{bus.code}</p>
                <p className="font-mono text-[9px] text-teal-700 font-semibold whitespace-nowrap">
                  {bus.etaMinutes}m
                </p>
              </div>
            </button>
          </AdvancedMarker>
        ))}

        {/* Selected Bus Company Route Marker */}
        {selectedCompanyRoute && (
          <AdvancedMarker
            position={selectedCompanyRoute.center}
            zIndex={75}
            title={`${selectedCompanyRoute.company} · Ruta ${selectedCompanyRoute.code}`}
          >
            <div className="flex flex-col items-center">
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white shadow-xl border-2 border-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center shrink-0">
                  <Bus className="w-3.5 h-3.5 text-white" />
                </span>
                <div className="text-left leading-tight">
                  <p className="font-headline text-xs font-bold text-white whitespace-nowrap">
                    {selectedCompanyRoute.code}
                  </p>
                  <p className="text-[10px] text-teal-300 font-medium whitespace-nowrap">
                    {selectedCompanyRoute.company}
                  </p>
                </div>
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Custom Origin Marker (Punto de partida) */}
        {originMarker && (
          <AdvancedMarker
            position={originMarker.position}
            zIndex={78}
            title={`Partida: ${originMarker.name}`}
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
                <Navigation className="w-4 h-4" />
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold shadow border border-white max-w-[150px] truncate">
                A · {originMarker.name}
              </span>
            </div>
          </AdvancedMarker>
        )}

        {/* Selected Search Destination Pin */}
        {selectedDestination && (
          <AdvancedMarker
            position={selectedDestination.position}
            zIndex={82}
            title={`Destino: ${selectedDestination.name}`}
          >
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-teal-400 flex items-center justify-center shadow-xl border-2 border-white ring-2 ring-teal-500/40">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="mt-1 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-semibold shadow-lg border border-slate-700 max-w-[170px] truncate">
                B · {selectedDestination.name}
              </span>
            </div>
          </AdvancedMarker>
        )}

        {/* User Current Location */}
        <AdvancedMarker position={userPosition} zIndex={70} title="Tu ubicación GPS">
          <div className="flex flex-col items-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-[#0D9488]/30 animate-ping absolute" />
              <div className="w-4 h-4 rounded-full bg-[#0D9488] border-2 border-white shadow-md" />
            </div>
            <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-medium shadow whitespace-nowrap">
              Tú aquí
            </span>
          </div>
        </AdvancedMarker>
      </GoogleMap>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Routes Catalog Interactive Map (Screen: Rutas)                    */
/* ------------------------------------------------------------------ */

function RoutesBoundsWatcher({
  onBoundsChanged,
}: {
  onBoundsChanged?: (bounds: MapBounds) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !onBoundsChanged) return;

    const emit = () => {
      const b = map.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      onBoundsChanged({
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      });
    };

    const listener = map.addListener('idle', emit);
    const t = window.setTimeout(emit, 250);
    return () => {
      window.clearTimeout(t);
      listener.remove();
    };
  }, [map, onBoundsChanged]);

  return null;
}

function RoutesCatalogPolylines({
  routes,
  selectedRouteId,
  onSelectRoute,
}: {
  routes: CompanyRouteItem[];
  selectedRouteId?: string | null;
  onSelectRoute: (route: CompanyRouteItem) => void;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib) return;

    const polylines: google.maps.Polyline[] = [];
    const subset = routes.slice(0, 36);

    for (const route of subset) {
      if (route.path.length < 2 || route.id === selectedRouteId) continue;
      const poly = new mapsLib.Polyline({
        path: route.path,
        strokeColor: route.color,
        strokeOpacity: selectedRouteId ? 0.28 : 0.62,
        strokeWeight: 3.5,
        geodesic: true,
        clickable: true,
        zIndex: 12,
        map,
      });
      poly.addListener('click', () => onSelectRoute(route));
      polylines.push(poly);
    }

    return () => {
      for (const poly of polylines) {
        poly.setMap(null);
      }
    };
  }, [map, mapsLib, routes, selectedRouteId, onSelectRoute]);

  return null;
}

interface BarranquillaRoutesMapProps {
  routes: CompanyRouteItem[];
  selectedRoute: CompanyRouteItem | null;
  signal: MapControlSignal | null;
  onBoundsChanged?: (bounds: MapBounds) => void;
  onSelectRoute: (route: CompanyRouteItem) => void;
  onCameraSync?: (zoom: number, isAtDefault: boolean) => void;
}

const ROUTES_DEFAULT_CENTER: LatLng = {lat: 10.978, lng: -74.803};

export function BarranquillaRoutesMap({
  routes,
  selectedRoute,
  signal,
  onBoundsChanged,
  onSelectRoute,
  onCameraSync,
}: BarranquillaRoutesMapProps) {
  const isDraggingRef = useRef(false);
  const markerRoutes = routes.slice(0, 18);

  return (
    <div className="absolute inset-0 w-full h-full">
      <MapStatusOverlay theme="light" />
      <GoogleMap
        id="baq-routes-map"
        mapId={DEMO_MAP_ID}
        defaultCenter={ROUTES_DEFAULT_CENTER}
        defaultZoom={13}
        minZoom={11}
        maxZoom={18}
        gestureHandling="greedy"
        disableDefaultUI={true}
        internalUsageAttributionIds={ATTRIBUTION_IDS}
        onDragstart={() => {
          isDraggingRef.current = true;
        }}
        onIdle={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 80);
        }}
        style={{width: '100%', height: '100%'}}
      >
        <CameraController
          signal={signal}
          defaultCenter={ROUTES_DEFAULT_CENTER}
          defaultZoom={13}
          onCameraSync={onCameraSync}
        />
        <RoutesBoundsWatcher onBoundsChanged={onBoundsChanged} />
        <RoutesCatalogPolylines
          routes={routes}
          selectedRouteId={selectedRoute?.id ?? null}
          onSelectRoute={onSelectRoute}
        />
        <SelectedRouteOverlay route={selectedRoute} />

        {markerRoutes.map((route) => {
          const isSelected = selectedRoute?.id === route.id;
          if (isSelected) return null;
          return (
            <AdvancedMarker
              key={`rm-${route.id}`}
              position={route.center}
              zIndex={20}
              onClick={() => {
                if (!isDraggingRef.current) onSelectRoute(route);
              }}
              title={`${route.code} · ${route.company}`}
            >
              <button
                type="button"
                className="px-2 py-0.5 rounded-full bg-white/95 hover:bg-slate-900 hover:text-white text-slate-900 border border-slate-300 shadow-md text-[10px] font-headline font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Bus className="w-3 h-3 text-[#0D9488]" />
                <span>{route.code}</span>
              </button>
            </AdvancedMarker>
          );
        })}

        {selectedRoute && (
          <AdvancedMarker
            position={selectedRoute.center}
            zIndex={75}
            title={`${selectedRoute.company} · Ruta ${selectedRoute.code}`}
          >
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white shadow-xl border-2 border-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center shrink-0">
                <Bus className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="text-left leading-tight">
                <p className="font-headline text-xs font-bold text-white whitespace-nowrap">
                  {selectedRoute.code}
                </p>
                <p className="text-[10px] text-teal-300 font-medium whitespace-nowrap">
                  {selectedRoute.company}
                </p>
              </div>
            </div>
          </AdvancedMarker>
        )}
      </GoogleMap>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fleet Map (Screen: Operador)                                      */
/* ------------------------------------------------------------------ */

interface BarranquillaFleetMapProps {
  buses: FleetBus[];
  routeCategoryFilter: 'all' | 'troncal' | 'alimentador' | 'expreso';
  onInspectBus: (bus: FleetBus) => void;
}

export function BarranquillaFleetMap({
  buses,
  routeCategoryFilter,
  onInspectBus,
}: BarranquillaFleetMapProps) {
  const [fleetSignal, setFleetSignal] = useState<MapControlSignal | null>(null);

  const visibleBuses = buses.filter((b) =>
    routeCategoryFilter === 'all' ? true : b.category === routeCategoryFilter
  );

  return (
    <div className="relative w-full h-full">
      <MapStatusOverlay theme="dark" />
      <GoogleMap
        id="baq-fleet-map"
        mapId={DEMO_MAP_ID}
        colorScheme="DARK"
        defaultCenter={BARRANQUILLA_FLEET_CENTER}
        defaultZoom={14}
        minZoom={11}
        maxZoom={18}
        gestureHandling="greedy"
        disableDefaultUI={true}
        internalUsageAttributionIds={ATTRIBUTION_IDS}
        style={{width: '100%', height: '100%'}}
      >
        <CameraController
          signal={fleetSignal}
          defaultCenter={BARRANQUILLA_FLEET_CENTER}
          defaultZoom={14}
        />
        <TransitCorridorsOverlay visible={true} routeFilter="all" showTraffic={false} />

        {visibleBuses.map((bus) => {
          const pct = Math.round((bus.paxCurrent / bus.paxMax) * 100);
          const colorBg =
            bus.category === 'troncal'
              ? 'bg-[#2563EB]'
              : bus.category === 'alimentador'
              ? 'bg-[#16A34A]'
              : 'bg-[#DC2626]';
          const tagColor =
            bus.category === 'troncal'
              ? 'text-teal-300 border-slate-700'
              : bus.category === 'alimentador'
              ? 'text-emerald-400 border-slate-700'
              : 'text-rose-400 border-rose-800';

          return (
            <AdvancedMarker
              key={bus.id}
              position={bus.position}
              zIndex={bus.hasDelay ? 60 : 40}
              onClick={() => onInspectBus(bus)}
              title={`#${bus.id} · ${bus.routeLabel}`}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-7 h-7 rounded-full ${colorBg} text-white flex items-center justify-center shadow-lg border-2 border-white ${
                    bus.hasDelay ? 'animate-pulse' : ''
                  } group-hover:scale-110 transition-transform`}
                >
                  {bus.hasDelay ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Bus className="w-3.5 h-3.5" />
                  )}
                </div>
                <div
                  className={`px-2 py-0.5 rounded bg-slate-950/95 text-white border font-mono text-[11px] shadow whitespace-nowrap ${tagColor}`}
                >
                  <span className="font-bold">#{bus.id}</span> • {bus.routeCode} (
                  {bus.hasDelay ? bus.etaLabel : `${pct}%`})
                </div>
              </button>
            </AdvancedMarker>
          );
        })}
      </GoogleMap>

      {/* Quick recenter button inside fleet viewport */}
      <button
        type="button"
        onClick={() => setFleetSignal({type: 'reset', nonce: Date.now()})}
        className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded bg-slate-950/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px] shadow transition-colors"
      >
        Centrar BAQ
      </button>
    </div>
  );
}
